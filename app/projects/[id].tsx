import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Image, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiClient, resolveMediaUrl } from '../../src/core/services/api.service';
import { resolveAccentColor } from '../../src/core/theme/companyTheme';
import { getLocalProjects, getLocalTechnicians } from '../../src/core/services/database.service';
import GlassCard from '../../src/components/GlassCard';
import CustomInput from '../../src/components/CustomInput';
import CustomButton from '../../src/components/CustomButton';
import SearchableDropdown from '../../src/components/SearchableDropdown';
import DatePickerInput from '../../src/components/DatePickerInput';
import ScreenHeader from '../../src/components/ScreenHeader';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

type ActiveTab = 'overview' | 'activities' | 'procurement' | 'finance' | 'team' | 'gallery';
type ProcurementTab = 'requisitions' | 'lpos' | 'store';
type FinanceTab = 'payments' | 'expenses' | 'sitefund';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isDark } = useAppTheme();

  // Redux user & theme selection
  const { user, themeColor, companyTheme, permissions } = useSelector((state: any) => state.auth);
  const activeColor = resolveAccentColor(themeColor, companyTheme);
  // Same "not loaded yet -> show it" fallback used for tab visibility in
  // app/(tabs)/_layout.tsx, and the same permission mapping as the admin's
  // project-detail tabs (admin/.../project-detail.component.html).
  const hasPermission = (p: string) => !permissions || permissions.length === 0 || permissions.includes(p);

  // State Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [procurementTab, setProcurementTab] = useState<ProcurementTab>('requisitions');
  const [financeTab, setFinanceTab] = useState<FinanceTab>('payments');

  // Modals Toggles
  const [showReqModal, setShowReqModal] = useState(false);
  const [showLpoModal, setShowLpoModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Dynamic Details Modals
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [selectedLpo, setSelectedLpo] = useState<any | null>(null);

  // Workflow Dialog states
  const [showCommentModal, setShowCommentModal] = useState<{ visible: boolean; type: 'submit' | 'review' | 'approve' | 'submit-lpo' | 'approve-lpo' | 'send-lpo' }>({ visible: false, type: 'submit' });
  const [workflowComment, setWorkflowComment] = useState('');
  const [showReasonModal, setShowReasonModal] = useState<{ visible: boolean; type: 'reject' | 'cancel' | 'cancel-lpo'; title: string }>({ visible: false, type: 'reject', title: '' });
  const [workflowReason, setWorkflowReason] = useState('');
  
  // Custom Issue Goods / Receive Goods modals
  const [showReqIssueModal, setShowReqIssueModal] = useState(false);
  const [issueItemsInput, setIssueItemsInput] = useState<any[]>([]);
  const [issueComment, setIssueComment] = useState('');

  const [showLpoReceiveModal, setShowLpoReceiveModal] = useState(false);
  const [receiveItemsInput, setReceiveItemsInput] = useState<any[]>([]);
  const [receiveComment, setReceiveComment] = useState('');

  // Add Comments states
  const [reqCommentText, setReqCommentText] = useState('');
  const [reqCommentInternal, setReqCommentInternal] = useState(false);

  const [lpoCommentText, setLpoCommentText] = useState('');
  const [lpoCommentInternal, setLpoCommentInternal] = useState(false);

  // Requisition Form states
  const [reqSiteLocation, setReqSiteLocation] = useState('');
  const [reqDesignation, setReqDesignation] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [reqItems, setReqItems] = useState<any[]>([{ productId: 'generic-item', description: '', unit: 'pcs', quantity: '0' }]);

  // LPO Form states
  const [lpoSupplierId, setLpoSupplierId] = useState('');
  const [lpoActivityId, setLpoActivityId] = useState('');
  const [lpoDeliveryAddress, setLpoDeliveryAddress] = useState('');
  const [lpoPaymentTerms, setLpoPaymentTerms] = useState('30 days net');
  const [lpoNotes, setLpoNotes] = useState('');
  const [lpoItems, setLpoItems] = useState<any[]>([{ productId: 'generic-product', quantity: '0', unitPrice: '0', unit: 'pcs', description: '' }]);
  const [lpoRequisitionId, setLpoRequisitionId] = useState('');
  const [showStoreIssueModal, setShowStoreIssueModal] = useState(false);
  const [storeIssueTechId, setStoreIssueTechId] = useState('');
  const [storeIssueNotes, setStoreIssueNotes] = useState('');
  const [storeIssueItems, setStoreIssueItems] = useState<any[]>([{ storeItemId: '', quantity: '0' }]);

  // Finance Form states
  const [payActivityId, setPayActivityId] = useState('');
  const [payTechId, setPayTechId] = useState('');
  const [payDescription, setPayDescription] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payDueDate, setPayDueDate] = useState('');
  const [payStatus, setPayStatus] = useState('Open');

  // Expense Form states
  const [expActivityId, setExpActivityId] = useState('');
  const [expCategoryId, setExpCategoryId] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // Gallery Form state
  const [galleryImage, setGalleryImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Team Assignment state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('');

  // Queries
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/projects/${id}`);
        return res.data?.data?.project || res.data?.data || res.data;
      } catch (err) {
        const cached = await getLocalProjects();
        return cached.find((p: any) => p.id === id);
      }
    }
  });

  const { data: activities, isLoading: loadingActivities } = useQuery({
    queryKey: ['project-activities', id],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}/activities`);
      return res.data?.data?.activities || res.data?.data || [];
    },
    enabled: activeTab === 'activities' || showPaymentModal || showExpenseModal || showLpoModal
  });

  const { data: requisitions, isLoading: loadingReqs, refetch: refetchReqs } = useQuery({
    queryKey: ['project-requisitions', id],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}/requisitions`);
      return res.data?.data?.requisitions || res.data?.data || [];
    },
    enabled: (activeTab === 'procurement' && procurementTab === 'requisitions') || showLpoModal
  });

  const { data: lpos, isLoading: loadingLpos, refetch: refetchLpos } = useQuery({
    queryKey: ['project-lpos', id],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}/lpos`);
      return res.data?.data?.lpos || res.data?.data || [];
    },
    enabled: activeTab === 'procurement' && procurementTab === 'lpos'
  });

  const { data: storeItems, isLoading: loadingStore, refetch: refetchStore } = useQuery({
    queryKey: ['project-store', id],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}/store`);
      return res.data?.data?.items || res.data?.data || res.data || [];
    },
    enabled: activeTab === 'procurement' && procurementTab === 'store'
  });

  const { data: technicians } = useQuery({
    queryKey: ['techs-list'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/technicians');
        return res.data?.data?.technicians || res.data?.data || [];
      } catch (err) {
        return await getLocalTechnicians();
      }
    }
  });

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const res = await apiClient.get('/products/all');
      return res.data?.data?.products || res.data?.data || [];
    }
  });

  const { data: payments, isLoading: loadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['project-payments', id],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}/finance/payments`);
      return res.data?.data?.payments || res.data?.data || [];
    },
    enabled: activeTab === 'finance' && financeTab === 'payments'
  });

  const { data: expenses, isLoading: loadingExpenses, refetch: refetchExpenses } = useQuery({
    queryKey: ['project-expenses', id],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}/finance/expenses`);
      return res.data?.data?.expenses || res.data?.data || [];
    },
    enabled: activeTab === 'finance' && financeTab === 'expenses'
  });

  const { data: siteFund, isLoading: loadingSiteFund, error: siteFundError, refetch: refetchSiteFund } = useQuery({
    queryKey: ['project-site-fund', id],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}/site-fund/my-balance`);
      return res.data?.data || null;
    },
    enabled: activeTab === 'finance' && financeTab === 'sitefund',
    retry: false
  });

  const { data: expenseCategories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/expense-categories');
      return res.data?.data?.categories || res.data?.data || res.data || [];
    },
    enabled: showExpenseModal
  });

  const { data: projectTeam, isLoading: loadingTeam, refetch: refetchTeam } = useQuery({
    queryKey: ['project-team', id],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}/team`);
      return res.data?.data?.team || res.data?.team || [];
    },
    enabled: activeTab === 'team'
  });

  const { data: projectTechs, isLoading: loadingProjTechs, refetch: refetchProjTechs } = useQuery({
    queryKey: ['project-techs', id],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}/technicians`);
      return res.data?.data?.technicians || res.data?.data || [];
    },
    enabled: activeTab === 'team' || showPaymentModal || showStoreIssueModal
  });

  const { data: galleryItems, isLoading: loadingGallery, refetch: refetchGallery } = useQuery({
    queryKey: ['project-gallery', id],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}/gallery`);
      return res.data?.data?.items || res.data?.data || [];
    },
    enabled: activeTab === 'gallery'
  });

  const { data: allUsers } = useQuery({
    queryKey: ['users-list-assign'],
    queryFn: async () => {
      const res = await apiClient.get('/users');
      return res.data?.data?.users || res.data?.data || [];
    },
    enabled: activeTab === 'team'
  });

  const { data: teamRoles } = useQuery({
    queryKey: ['roles-list'],
    queryFn: async () => {
      const res = await apiClient.get('/roles');
      return res.data?.data?.roles || res.data?.data || [];
    },
    enabled: activeTab === 'team'
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const res = await apiClient.get('/suppliers');
      return res.data?.data?.suppliers || res.data?.data || [];
    }
  });

  // Dropdown Options
  const productOptions = (products || []).map((p: any) => ({
    value: p.id,
    label: p.name,
    sublabel: `${p.code || ''} ${p.uom ? '— ' + p.uom.name : ''}`.trim()
  }));

  const activityOptions = (activities || []).map((act: any) => ({
    value: act.id,
    label: act.name,
    sublabel: act.code || ''
  }));

  const supplierOptions = (suppliers || []).map((s: any) => ({
    value: s.id,
    label: s.name,
    sublabel: s.category || ''
  }));

  const requisitionOptions = (requisitions || []).map((r: any) => ({
    value: r.id,
    label: r.requisitionNo || `RN-${r.id.substring(0, 8)}`,
    sublabel: `${r.siteLocation || ''} — ${r.status}`
  }));

  const technicianOptions = (projectTechs || []).map((t: any) => {
    const tech = t.technician || t;
    return {
      value: tech.id,
      label: tech.name || '',
      sublabel: `${tech.phone || ''} ${tech.category?.name ? '— ' + tech.category.name : ''}`.trim()
    };
  });

  const expenseCategoryOptions = (expenseCategories || []).map((cat: any) => ({
    value: cat.id,
    label: cat.name
  }));

  const allUsersOptions = (allUsers || []).map((u: any) => ({
    value: u.id,
    label: `${u.firstName} ${u.lastName}`,
    sublabel: u.jobTitle || u.email || ''
  }));

  // Role is stored on TeamMember as a free-text label (matches the admin web app),
  // but the options themselves come from the real Roles table.
  const roleOptions = (teamRoles || []).map((r: any) => ({
    value: r.name,
    label: r.name,
    sublabel: r.description || ''
  }));

  const availableStoreItems = (storeItems || []).filter((i: any) => parseFloat(i.quantity) > 0);
  const storeItemOptions = availableStoreItems.map((i: any) => ({
    value: i.id,
    label: `${i.product?.name || i.description} (${i.quantity} ${i.unit || 'pcs'} available)`,
    sublabel: i.location || ''
  }));

  // Triggered when requisition is chosen in LPO Modal
  const handleSelectRequisitionForLpo = async (reqId: string) => {
    setLpoRequisitionId(reqId);
    if (!reqId) {
      setLpoItems([{ productId: 'generic-product', quantity: '0', unitPrice: '0', unit: 'pcs', description: '' }]);
      return;
    }
    try {
      const res = await apiClient.get(`/projects/${id}/requisitions/${reqId}`);
      const rn = res.data?.data?.requisition || res.data?.data;
      if (rn && rn.items?.length) {
        const loadedItems = rn.items.map((item: any) => {
          const matchingProduct = (products || []).find((p: any) => p.name === item.description);
          return {
            productId: item.productId || matchingProduct?.id || 'generic-product',
            description: item.description,
            unit: item.unit || 'pcs',
            quantity: (item.quantityOrdered || 0).toString(),
            unitPrice: (item.unitPrice || matchingProduct?.unitPrice || 0).toString(),
            requisitionItemId: item.id
          };
        });
        setLpoItems(loadedItems);
        if (rn.siteLocation) {
          setLpoDeliveryAddress(rn.siteLocation);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load requisition items for LPO.');
    }
  };

  // Store Issue distribution handlers
  const handleOpenIssueToTechnicianModal = () => {
    setStoreIssueTechId('');
    setStoreIssueNotes('');
    setStoreIssueItems([{ storeItemId: '', quantity: '0' }]);
    setShowStoreIssueModal(true);
  };

  const handleCreateStoreIssue = async () => {
    if (!storeIssueTechId) {
      Alert.alert('Validation Error', 'Please select a technician.');
      return;
    }
    if (storeIssueItems.some(item => !item.storeItemId || parseFloat(item.quantity) <= 0)) {
      Alert.alert('Validation Error', 'Please select items and enter valid quantities.');
      return;
    }
    for (const item of storeIssueItems) {
      const storeItem = storeItems.find((si: any) => si.id === item.storeItemId);
      if (storeItem && parseFloat(item.quantity) > parseFloat(storeItem.quantity)) {
        Alert.alert('Validation Error', `Quantity for ${storeItem.product?.name || storeItem.description} exceeds available stock of ${storeItem.quantity}.`);
        return;
      }
    }
    const payload = {
      notes: storeIssueNotes || undefined,
      distributions: [
        {
          technicianId: storeIssueTechId,
          items: storeIssueItems.map(it => {
            const opt = storeItems.find((si: any) => si.id === it.storeItemId);
            return {
              storeItemId: it.storeItemId,
              productId: opt?.productId || null,
              description: opt?.product?.name || opt?.description || '',
              unit: opt?.unit || 'pcs',
              quantity: parseFloat(it.quantity)
            };
          })
        }
      ]
    };
    try {
      await apiClient.post(`/projects/${id}/technician-receipts/distribute`, payload);
      Alert.alert('Success', 'Items distributed to technician successfully.');
      setShowStoreIssueModal(false);
      refetchStore();
    } catch (err) {
      Alert.alert('Error', 'Failed to distribute items.');
    }
  };

  // Action Handlers - Requisitions Workflow
  const handleCreateRequisition = async () => {
    if (reqItems.some(item => parseFloat(item.quantity) <= 0)) {
      Alert.alert('Validation Error', 'Please specify valid quantities.');
      return;
    }
    const payload = {
      siteLocation: reqSiteLocation,
      designation: reqDesignation,
      notes: reqNotes,
      items: reqItems.map(item => ({
        productId: item.productId,
        description: item.description || 'Materials',
        unit: item.unit,
        quantityOrdered: parseFloat(item.quantity)
      }))
    };
    try {
      await apiClient.post(`/projects/${id}/requisitions`, payload);
      Alert.alert('Success', 'Requisition Note registered successfully in Draft status.');
      setShowReqModal(false);
      setReqItems([{ productId: 'generic-item', description: '', unit: 'pcs', quantity: '0' }]);
      setReqNotes('');
      refetchReqs();
    } catch (err) {
      Alert.alert('Error', 'Failed to save requisition note.');
    }
  };

  const handleOpenRequisitionDetails = async (req: any) => {
    try {
      const res = await apiClient.get(`/projects/${id}/requisitions/${req.id}`);
      setSelectedReq(res.data?.data?.requisition || res.data?.data || req);
    } catch (err) {
      setSelectedReq(req);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!selectedReq) return;
    const { type } = showCommentModal;
    const comment = workflowComment;
    try {
      if (type === 'submit') {
        await apiClient.post(`/projects/${id}/requisitions/${selectedReq.id}/submit`, { comment });
        Alert.alert('Success', 'Requisition submitted successfully.');
      } else if (type === 'review') {
        await apiClient.post(`/projects/${id}/requisitions/${selectedReq.id}/review`, { comment });
        Alert.alert('Success', 'Requisition reviewed successfully.');
      } else if (type === 'approve') {
        await apiClient.post(`/projects/${id}/requisitions/${selectedReq.id}/approve`, { comment });
        Alert.alert('Success', 'Requisition approved successfully.');
      } else if (type === 'submit-lpo') {
        await apiClient.post(`/projects/${id}/lpos/${selectedLpo.id}/submit`, { comment });
        Alert.alert('Success', 'LPO submitted successfully.');
      } else if (type === 'approve-lpo') {
        await apiClient.post(`/projects/${id}/lpos/${selectedLpo.id}/approve`, { comment });
        Alert.alert('Success', 'LPO approved successfully.');
      } else if (type === 'send-lpo') {
        await apiClient.post(`/projects/${id}/lpos/${selectedLpo.id}/send`, { comment });
        Alert.alert('Success', 'LPO marked as sent successfully.');
      }
      
      setShowCommentModal({ visible: false, type: 'submit' });
      setWorkflowComment('');
      setSelectedReq(null);
      setSelectedLpo(null);
      refetchReqs();
      refetchLpos();
    } catch (err) {
      Alert.alert('Error', 'Action failed. Please try again.');
    }
  };

  const handleExecuteReasonWorkflow = async () => {
    if (!selectedReq && !selectedLpo) return;
    const { type } = showReasonModal;
    const reason = workflowReason;
    if (!reason.trim()) {
      Alert.alert('Error', 'Reason is required.');
      return;
    }
    try {
      if (type === 'reject') {
        await apiClient.post(`/projects/${id}/requisitions/${selectedReq.id}/reject`, { reason });
        Alert.alert('Success', 'Requisition rejected.');
      } else if (type === 'cancel') {
        await apiClient.post(`/projects/${id}/requisitions/${selectedReq.id}/cancel`, { reason });
        Alert.alert('Success', 'Requisition cancelled.');
      } else if (type === 'cancel-lpo') {
        await apiClient.post(`/projects/${id}/lpos/${selectedLpo.id}/cancel`, { reason });
        Alert.alert('Success', 'LPO cancelled.');
      }

      setShowReasonModal({ visible: false, type: 'reject', title: '' });
      setWorkflowReason('');
      setSelectedReq(null);
      setSelectedLpo(null);
      refetchReqs();
      refetchLpos();
    } catch (err) {
      Alert.alert('Error', 'Action failed.');
    }
  };

  const handleAddReqComment = async () => {
    if (!selectedReq || !reqCommentText.trim()) return;
    try {
      await apiClient.post(`/projects/${id}/requisitions/${selectedReq.id}/comments`, {
        comment: reqCommentText,
        isInternal: reqCommentInternal
      });
      setReqCommentText('');
      setReqCommentInternal(false);
      handleOpenRequisitionDetails(selectedReq);
    } catch (err) {
      Alert.alert('Error', 'Failed to add comment.');
    }
  };

  const handleDeleteRequisition = async (reqId: string) => {
    Alert.alert('Confirm Delete', 'Delete this Requisition Draft?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'DELETE',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/projects/${id}/requisitions/${reqId}`);
            Alert.alert('Success', 'Requisition deleted.');
            setSelectedReq(null);
            refetchReqs();
          } catch (err) {
            Alert.alert('Error', 'Delete failed.');
          }
        }
      }
    ]);
  };

  const handleOpenIssueModal = () => {
    if (!selectedReq) return;
    const itemsToIssue = (selectedReq.items || []).map((item: any) => ({
      id: item.id,
      description: item.description,
      unit: item.unit,
      quantityOrdered: item.quantityOrdered,
      quantityIssued: String(Math.max(0, (item.quantityOrdered || 0) - (item.quantityIssued || 0)))
    }));
    setIssueItemsInput(itemsToIssue);
    setIssueComment('');
    setShowReqIssueModal(true);
  };

  const handleIssueRequisitionGoods = async () => {
    if (!selectedReq) return;
    try {
      const payload = {
        comment: issueComment || 'Goods issued from project store.',
        issuedItems: issueItemsInput.map(item => ({
          id: item.id,
          quantityIssued: parseFloat(item.quantityIssued || '0')
        }))
      };
      await apiClient.post(`/projects/${id}/requisitions/${selectedReq.id}/issue`, payload);
      Alert.alert('Success', 'Goods issued successfully.');
      setShowReqIssueModal(false);
      setSelectedReq(null);
      refetchReqs();
      refetchStore();
    } catch (err) {
      Alert.alert('Error', 'Failed to issue items.');
    }
  };

  // Action Handlers - LPOs Workflow
  const handleOpenLpoDetails = async (lpo: any) => {
    try {
      const res = await apiClient.get(`/projects/${id}/lpos/${lpo.id}`);
      setSelectedLpo(res.data?.data?.lpo || res.data?.data || lpo);
    } catch (err) {
      setSelectedLpo(lpo);
    }
  };

  const handleCreateLpo = async () => {
    if (!lpoActivityId) {
      Alert.alert('Validation Error', 'Please select a project activity.');
      return;
    }
    if (lpoItems.some(item => parseFloat(item.quantity) <= 0 || parseFloat(item.unitPrice) <= 0)) {
      Alert.alert('Validation Error', 'Please enter valid quantities and prices.');
      return;
    }
    const payload = {
      supplierId: lpoSupplierId,
      activityId: lpoActivityId,
      requisitionId: lpoRequisitionId || null,
      deliveryAddress: lpoDeliveryAddress,
      paymentTerms: lpoPaymentTerms,
      notes: lpoNotes,
      items: lpoItems.map(item => ({
        productId: item.productId,
        description: item.description || 'Materials',
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        unit: item.unit,
        requisitionItemId: item.requisitionItemId || null
      }))
    };
    try {
      await apiClient.post(`/projects/${id}/lpos`, payload);
      Alert.alert('Success', 'LPO created successfully.');
      setShowLpoModal(false);
      setLpoItems([{ productId: 'generic-product', quantity: '0', unitPrice: '0', unit: 'pcs', description: '' }]);
      setLpoRequisitionId('');
      setLpoNotes('');
      refetchLpos();
    } catch (err) {
      Alert.alert('Error', 'Failed to save LPO.');
    }
  };

  const handleAddLpoComment = async () => {
    if (!selectedLpo || !lpoCommentText.trim()) return;
    try {
      await apiClient.post(`/projects/${id}/lpos/${selectedLpo.id}/comments`, {
        comment: lpoCommentText,
        isInternal: lpoCommentInternal
      });
      setLpoCommentText('');
      setLpoCommentInternal(false);
      handleOpenLpoDetails(selectedLpo);
    } catch (err) {
      Alert.alert('Error', 'Failed to add comment.');
    }
  };

  const handleDeleteLpo = async (lpoId: string) => {
    Alert.alert('Confirm Delete', 'Delete this Purchase Order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'DELETE',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/projects/${id}/lpos/${lpoId}`);
            Alert.alert('Success', 'LPO deleted.');
            setSelectedLpo(null);
            refetchLpos();
          } catch (err) {
            Alert.alert('Error', 'Delete failed.');
          }
        }
      }
    ]);
  };

  const handleOpenReceiveModal = () => {
    if (!selectedLpo) return;
    const itemsToReceive = (selectedLpo.items || []).map((item: any) => ({
      id: item.id,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      quantityReceived: String(Math.max(0, (item.quantity || 0) - (item.quantityReceived || 0)))
    }));
    setReceiveItemsInput(itemsToReceive);
    setReceiveComment('');
    setShowLpoReceiveModal(true);
  };

  const handleReceiveLpoGoods = async () => {
    if (!selectedLpo) return;
    try {
      const payload = {
        comment: receiveComment || 'Goods received at site.',
        receivedItems: receiveItemsInput.map(item => ({
          id: item.id,
          quantityReceived: parseFloat(item.quantityReceived || '0')
        }))
      };
      await apiClient.post(`/projects/${id}/lpos/${selectedLpo.id}/receive`, payload);
      Alert.alert('Success', 'Goods receipt logged successfully.');
      setShowLpoReceiveModal(false);
      setSelectedLpo(null);
      refetchLpos();
      refetchStore();
    } catch (err) {
      Alert.alert('Error', 'Failed to log goods receipt.');
    }
  };

  // Action Handlers - Payments & Expenses Actions
  const handleCreatePayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) {
      Alert.alert('Validation Error', 'Please specify a valid payment amount.');
      return;
    }
    const payload = {
      activityId: payActivityId || null,
      technicianId: payTechId || null,
      description: payDescription,
      amount: parseFloat(payAmount),
      currency: 'TZS',
      date: payDate || new Date().toISOString().split('T')[0],
      dueDate: payDueDate || null,
      status: payStatus
    };
    try {
      await apiClient.post(`/projects/${id}/finance/payments`, payload);
      Alert.alert('Success', 'Payment saved successfully.');
      setShowPaymentModal(false);
      setPayDescription('');
      setPayAmount('');
      refetchPayments();
    } catch (err) {
      Alert.alert('Error', 'Failed to register payment.');
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    Alert.alert('Mark as Paid', 'Confirm recording payment disbursement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'MARK PAID',
        onPress: async () => {
          try {
            await apiClient.post(`/projects/${id}/finance/payments/${paymentId}/approve`, { comment: 'Paid via Mobile ERP' });
            Alert.alert('Success', 'Payment marked as Paid.');
            refetchPayments();
          } catch (err) {
            Alert.alert('Error', 'Action failed.');
          }
        }
      }
    ]);
  };

  const handleDeletePayment = async (paymentId: string) => {
    Alert.alert('Delete Payment', 'Confirm deleting this payment record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'DELETE',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/projects/${id}/finance/payments/${paymentId}`);
            Alert.alert('Success', 'Payment record deleted.');
            refetchPayments();
          } catch (err) {
            Alert.alert('Error', 'Delete failed.');
          }
        }
      }
    ]);
  };

  const handleCreateExpense = async () => {
    if (!expAmount || parseFloat(expAmount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid expense amount.');
      return;
    }
    const payload = {
      activityId: expActivityId || null,
      categoryId: expCategoryId,
      description: expDescription,
      amount: parseFloat(expAmount),
      date: expDate || new Date().toISOString().split('T')[0],
      notes: expNotes
    };
    try {
      await apiClient.post(`/projects/${id}/finance/expenses`, payload);
      Alert.alert('Success', 'Expense logged successfully.');
      setShowExpenseModal(false);
      setExpDescription('');
      setExpAmount('');
      refetchExpenses();
    } catch (err) {
      Alert.alert('Error', 'Failed to save expense.');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    Alert.alert('Delete Expense', 'Confirm deleting this expense record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'DELETE',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/projects/${id}/finance/expenses/${expenseId}`);
            Alert.alert('Success', 'Expense record deleted.');
            refetchExpenses();
          } catch (err) {
            Alert.alert('Error', 'Delete failed.');
          }
        }
      }
    ]);
  };

  const handlePickGalleryImage = async (source: 'library' | 'camera') => {
    const permission = source === 'library'
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Required', `Please allow access to your ${source === 'library' ? 'photo library' : 'camera'} to attach a photo.`);
      return;
    }

    const result = source === 'library'
      ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })
      : await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const filename = asset.fileName || asset.uri.split('/').pop() || `photo-${Date.now()}.jpg`;
    const ext = filename.split('.').pop()?.toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    setGalleryImage({ uri: asset.uri, name: filename, type });
  };

  const handleAddGalleryItem = async () => {
    if (!galleryImage) {
      Alert.alert('Validation Error', 'Please choose or take a photo first.');
      return;
    }

    setUploadingGallery(true);
    try {
      // Step 1: upload the file to the media library
      const formData = new FormData();
      formData.append('file', { uri: galleryImage.uri, name: galleryImage.name, type: galleryImage.type } as any);
      formData.append('title', galleryTitle || 'Site Progress Photo');

      const uploadRes = await apiClient.post('/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const mediaId = uploadRes.data?.data?.media?.id;
      if (!mediaId) throw new Error('Upload did not return a media id');

      // Step 2: attach the uploaded media to this project's gallery
      await apiClient.post(`/projects/${id}/gallery`, {
        mediaId,
        caption: galleryTitle || 'Site Progress Photo',
      });

      Alert.alert('Success', 'Photo uploaded to project gallery.');
      setShowGalleryModal(false);
      setGalleryImage(null);
      setGalleryTitle('');
      refetchGallery();
    } catch (err) {
      Alert.alert('Error', 'Failed to upload photo.');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleAssignTeamMember = async () => {
    if (!assignUserId) {
      Alert.alert('Validation Error', 'Please select a team member.');
      return;
    }
    try {
      await apiClient.post(`/projects/${id}/team`, { userId: assignUserId, role: assignRole });
      setShowAssignModal(false);
      refetchTeam();

      // Mirrors the admin web app: assigning someone as "Storekeeper" also
      // registers them in this project's Storekeepers list for store access.
      if (assignRole === 'Storekeeper') {
        try {
          await apiClient.post(`/projects/${id}/storekeepers`, { userId: assignUserId });
          Alert.alert('Success', 'Member assigned as Storekeeper! They now appear in this project\'s Storekeepers list.');
        } catch {
          Alert.alert('Success', 'Team member assigned! (Storekeeper sync skipped — they may already be assigned.)');
        }
      } else {
        Alert.alert('Success', 'Team member assigned successfully.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to assign team member.');
    }
  };

  // Status Check Utilities (Matching Angular canX methods)
  const canSubmitReq = (r: any) => r.status === 'draft';
  const canReviewReq = (r: any) => r.status === 'submitted';
  const canApproveReq = (r: any) => r.status === 'reviewed';
  const canIssueReq = (r: any) => r.status === 'approved';
  const canRejectReq = (r: any) => !['issued', 'cancelled', 'rejected'].includes(r.status);
  const canCancelReq = (r: any) => !['issued', 'cancelled'].includes(r.status);
  const canDeleteReq = (r: any) => ['draft', 'rejected', 'cancelled'].includes(r.status);

  const canSubmitLpo = (l: any) => l.status === 'draft';
  const canApproveLpo = (l: any) => l.status === 'submitted';
  const canSendLpo = (l: any) => l.status === 'approved';
  const canReceiveLpo = (l: any) => l.status === 'sent';
  const canCancelLpo = (l: any) => !['received', 'cancelled'].includes(l.status);
  const canDeleteLpo = (l: any) => ['draft', 'cancelled'].includes(l.status);

  if (loadingProject) {
    return (
      <View style={[styles.screen, isDark ? styles.darkBg : styles.lightBg]}>
        <ScreenHeader title="Project" isDark={isDark} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={activeColor} />
        </View>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.screen, isDark ? styles.darkBg : styles.lightBg]}>
        <ScreenHeader title="Project" isDark={isDark} />
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={[styles.errorText, isDark ? styles.darkText : styles.lightText]}>Project details not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, isDark ? styles.darkBg : styles.lightBg]}>
      <ScreenHeader title={project.name} isDark={isDark} />
      <View style={styles.container}>

      {/* Segmented Top Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          <TouchableOpacity onPress={() => setActiveTab('overview')} style={[(isDark ? styles.tabButtonDark : styles.tabButton), activeTab === 'overview' && { backgroundColor: activeColor }]}>
            <Text style={[(isDark ? styles.tabButtonTextDark : styles.tabButtonText), activeTab === 'overview' && styles.tabButtonTextActive]}>Overview</Text>
          </TouchableOpacity>
          {hasPermission('activity:view') && (
            <TouchableOpacity onPress={() => setActiveTab('activities')} style={[(isDark ? styles.tabButtonDark : styles.tabButton), activeTab === 'activities' && { backgroundColor: activeColor }]}>
              <Text style={[(isDark ? styles.tabButtonTextDark : styles.tabButtonText), activeTab === 'activities' && styles.tabButtonTextActive]}>Activities</Text>
            </TouchableOpacity>
          )}
          {hasPermission('procurement:view') && (
            <TouchableOpacity onPress={() => setActiveTab('procurement')} style={[(isDark ? styles.tabButtonDark : styles.tabButton), activeTab === 'procurement' && { backgroundColor: activeColor }]}>
              <Text style={[(isDark ? styles.tabButtonTextDark : styles.tabButtonText), activeTab === 'procurement' && styles.tabButtonTextActive]}>Procurement</Text>
            </TouchableOpacity>
          )}
          {hasPermission('finance:view') && (
            <TouchableOpacity onPress={() => setActiveTab('finance')} style={[(isDark ? styles.tabButtonDark : styles.tabButton), activeTab === 'finance' && { backgroundColor: activeColor }]}>
              <Text style={[(isDark ? styles.tabButtonTextDark : styles.tabButtonText), activeTab === 'finance' && styles.tabButtonTextActive]}>Finance</Text>
            </TouchableOpacity>
          )}
          {hasPermission('team:view') && (
            <TouchableOpacity onPress={() => setActiveTab('team')} style={[(isDark ? styles.tabButtonDark : styles.tabButton), activeTab === 'team' && { backgroundColor: activeColor }]}>
              <Text style={[(isDark ? styles.tabButtonTextDark : styles.tabButtonText), activeTab === 'team' && styles.tabButtonTextActive]}>Team Directory</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setActiveTab('gallery')} style={[(isDark ? styles.tabButtonDark : styles.tabButton), activeTab === 'gallery' && { backgroundColor: activeColor }]}>
            <Text style={[(isDark ? styles.tabButtonTextDark : styles.tabButtonText), activeTab === 'gallery' && styles.tabButtonTextActive]}>Gallery</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <View style={styles.overviewSection}>
            <GlassCard style={styles.mainCard}>
              <View style={styles.badgeRow}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{project.projectCode}</Text>
                </View>
                <View style={[styles.statusBadge, project.status === 'Active' ? styles.activeBg : styles.closedBg]}>
                  <Text style={styles.statusText}>{project.status || 'Active'}</Text>
                </View>
              </View>
              <Text style={[styles.projectName, isDark ? styles.darkText : styles.lightText]}>{project.name}</Text>
              <Text style={styles.descriptionText}>
                {project.description || 'No detailed project description available in system archive.'}
              </Text>
            </GlassCard>

            {/* KPI Cards Grid */}
            <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Project Metrics</Text>
            <View style={styles.kpiGrid}>
              <GlassCard style={styles.kpiCard}>
                <MaterialCommunityIcons name="currency-usd" size={24} color="#10b981" />
                <Text style={styles.kpiLabel}>Total Budget</Text>
                <Text style={[styles.kpiValue, isDark ? styles.darkText : styles.lightText]}>
                  {project.totalBudget ? `${(project.totalBudget / 1000000).toFixed(1)}M` : '0'} TZS
                </Text>
              </GlassCard>
              <GlassCard style={styles.kpiCard}>
                <MaterialCommunityIcons name="chart-donut" size={24} color={activeColor} />
                <Text style={styles.kpiLabel}>Progress</Text>
                <Text style={[styles.kpiValue, isDark ? styles.darkText : styles.lightText]}>
                  {project.progress || 0}% Completed
                </Text>
              </GlassCard>
            </View>

            <GlassCard style={[styles.infoCard, { marginTop: 16 }]}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-range" size={20} color="#64748b" />
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Project Schedule Timeline</Text>
                  <Text style={[styles.infoVal, isDark ? styles.darkText : styles.lightText]}>
                    {project.startDate || '—'} to {project.endDate || '—'}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.infoRow, styles.borderTop]}>
                <MaterialCommunityIcons name="map-marker-radius" size={20} color="#64748b" />
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Location Coordinates</Text>
                  <Text style={[styles.infoVal, isDark ? styles.darkText : styles.lightText]}>
                    {project.location || 'Zanzibar Town'}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </View>
        )}

        {/* ACTIVITIES TAB */}
        {activeTab === 'activities' && (
          <View style={styles.tabContentSection}>
            <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Project Milestones</Text>
            {loadingActivities ? (
              <ActivityIndicator size="small" color={activeColor} />
            ) : activities && activities.length > 0 ? (
              activities.map((act: any) => (
                <GlassCard key={act.id} style={styles.kpiDetailCard}>
                  <View style={styles.badgeRow}>
                    <Text style={[styles.activityName, isDark ? styles.darkText : styles.lightText]}>{act.name}</Text>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeText}>{act.progress || 0}%</Text>
                    </View>
                  </View>
                  <Text style={styles.activityDesc}>{act.description || 'No description'}</Text>
                  <Text style={styles.activityMeta}>Due: {act.dueDate || 'No due date'}</Text>
                </GlassCard>
              ))
            ) : (
              <GlassCard style={styles.emptyContainer}>
                <MaterialCommunityIcons name="playlist-remove" size={40} color="#94a3b8" />
                <Text style={styles.emptyText}>No activities logged for this project.</Text>
              </GlassCard>
            )}
          </View>
        )}

        {/* PROCUREMENT TAB */}
        {activeTab === 'procurement' && (
          <View style={styles.tabContentSection}>
            {/* Procurement sub-selector */}
            <View style={[styles.subSelectorRow, isDark && styles.subSelectorRowDark]}>
              <TouchableOpacity onPress={() => setProcurementTab('requisitions')} style={[(isDark ? styles.subTabBtnDark : styles.subTabBtn), procurementTab === 'requisitions' && styles.subTabBtnActive]}>
                <Text style={[(isDark ? styles.subTabTextDark : styles.subTabText), procurementTab === 'requisitions' && { color: activeColor }]}>Requisitions</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setProcurementTab('lpos')} style={[(isDark ? styles.subTabBtnDark : styles.subTabBtn), procurementTab === 'lpos' && styles.subTabBtnActive]}>
                <Text style={[(isDark ? styles.subTabTextDark : styles.subTabText), procurementTab === 'lpos' && { color: activeColor }]}>LPOs</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setProcurementTab('store')} style={[(isDark ? styles.subTabBtnDark : styles.subTabBtn), procurementTab === 'store' && styles.subTabBtnActive]}>
                <Text style={[(isDark ? styles.subTabTextDark : styles.subTabText), procurementTab === 'store' && { color: activeColor }]}>Store</Text>
              </TouchableOpacity>
            </View>

            {/* REQUISITIONS LIST */}
            {procurementTab === 'requisitions' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Requisition Notes</Text>
                  {hasPermission('requisition:create') && (
                    <TouchableOpacity onPress={() => setShowReqModal(true)} style={[styles.addReqBtn, { backgroundColor: activeColor }]}>
                      <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                      <Text style={styles.addReqBtnText}>NEW NOTE</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {loadingReqs ? (
                  <ActivityIndicator size="small" color={activeColor} />
                ) : requisitions && requisitions.length > 0 ? (
                  requisitions.map((req: any) => (
                    <TouchableOpacity key={req.id} onPress={() => handleOpenRequisitionDetails(req)}>
                      <GlassCard style={styles.kpiDetailCard}>
                        <View style={styles.badgeRow}>
                          <Text style={[styles.activityName, isDark ? styles.darkText : styles.lightText]}>RN #{req.requisitionNo || req.id.substring(0,8)}</Text>
                          <View style={[styles.statusBadge, styles.activeBg]}>
                            <Text style={styles.statusText}>{req.status || 'Draft'}</Text>
                          </View>
                        </View>
                        <Text style={styles.activityDesc}>Site: {req.siteLocation || 'Zanzibar'}</Text>
                        <Text style={styles.activityMeta}>Tap to review details & track status</Text>
                      </GlassCard>
                    </TouchableOpacity>
                  ))
                ) : (
                  <GlassCard style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="file-document-outline" size={40} color="#94a3b8" />
                    <Text style={styles.emptyText}>No requisitions found.</Text>
                  </GlassCard>
                )}
              </View>
            )}

            {/* LPOS LIST */}
            {procurementTab === 'lpos' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Purchase Orders (LPOs)</Text>
                  {hasPermission('lpo:create') && (
                    <TouchableOpacity onPress={() => setShowLpoModal(true)} style={[styles.addReqBtn, { backgroundColor: activeColor }]}>
                      <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                      <Text style={styles.addReqBtnText}>NEW LPO</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {loadingLpos ? (
                  <ActivityIndicator size="small" color={activeColor} />
                ) : lpos && lpos.length > 0 ? (
                  lpos.map((lpo: any) => (
                    <TouchableOpacity key={lpo.id} onPress={() => handleOpenLpoDetails(lpo)}>
                      <GlassCard style={styles.kpiDetailCard}>
                        <View style={styles.badgeRow}>
                          <Text style={[styles.activityName, isDark ? styles.darkText : styles.lightText]}>LPO #{lpo.lpoNo || '—'}</Text>
                          <Text style={styles.lpoAmount}>{lpo.totalAmount?.toLocaleString() || '0'} TZS</Text>
                        </View>
                        <Text style={styles.activityDesc}>Supplier: {lpo.supplier?.name || 'Local Supplier'}</Text>
                        <Text style={styles.activityMeta}>Delivery: {lpo.deliveryAddress || 'Site'}</Text>
                      </GlassCard>
                    </TouchableOpacity>
                  ))
                ) : (
                  <GlassCard style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="cash-register" size={40} color="#94a3b8" />
                    <Text style={styles.emptyText}>No Purchase Orders (LPO) registered.</Text>
                  </GlassCard>
                )}
              </View>
            )}

            {/* PROJECT STORE INVENTORY */}
            {procurementTab === 'store' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Project Local Inventory</Text>
                  {storeItems && storeItems.length > 0 && hasPermission('store:issue') && (
                    <TouchableOpacity onPress={handleOpenIssueToTechnicianModal} style={[styles.addReqBtn, { backgroundColor: activeColor }]}>
                      <MaterialCommunityIcons name="account-arrow-right" size={16} color="#fff" />
                      <Text style={styles.addReqBtnText}>ISSUE TO TECH</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {loadingStore ? (
                  <ActivityIndicator size="small" color={activeColor} />
                ) : storeItems && storeItems.length > 0 ? (
                  storeItems.map((item: any) => (
                    <GlassCard key={item.id} style={styles.kpiDetailCard}>
                      <View style={styles.badgeRow}>
                        <Text style={[styles.activityName, isDark ? styles.darkText : styles.lightText]}>{item.product?.name || item.description}</Text>
                        <Text style={styles.qtyText}>{item.quantity} {item.unit || 'pcs'}</Text>
                      </View>
                      <Text style={styles.activityDesc}>Location: {item.location || 'Local Storage'}</Text>
                    </GlassCard>
                  ))
                ) : (
                  <GlassCard style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="warehouse" size={40} color="#94a3b8" />
                    <Text style={styles.emptyText}>No stock currently available in project local store.</Text>
                  </GlassCard>
                )}
              </View>
            )}
          </View>
        )}

        {/* FINANCE TAB */}
        {activeTab === 'finance' && (
          <View style={styles.tabContentSection}>
            <View style={[styles.subSelectorRow, isDark && styles.subSelectorRowDark]}>
              <TouchableOpacity onPress={() => setFinanceTab('payments')} style={[(isDark ? styles.subTabBtnDark : styles.subTabBtn), financeTab === 'payments' && styles.subTabBtnActive]}>
                <Text style={[(isDark ? styles.subTabTextDark : styles.subTabText), financeTab === 'payments' && { color: activeColor }]}>Payments</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFinanceTab('expenses')} style={[(isDark ? styles.subTabBtnDark : styles.subTabBtn), financeTab === 'expenses' && styles.subTabBtnActive]}>
                <Text style={[(isDark ? styles.subTabTextDark : styles.subTabText), financeTab === 'expenses' && { color: activeColor }]}>Expenses</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFinanceTab('sitefund')} style={[(isDark ? styles.subTabBtnDark : styles.subTabBtn), financeTab === 'sitefund' && styles.subTabBtnActive]}>
                <Text style={[(isDark ? styles.subTabTextDark : styles.subTabText), financeTab === 'sitefund' && { color: activeColor }]}>My Site Fund</Text>
              </TouchableOpacity>
            </View>

            {/* Payments List */}
            {financeTab === 'payments' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Recorded Payments</Text>
                  {hasPermission('payment:create') && (
                    <TouchableOpacity onPress={() => setShowPaymentModal(true)} style={[styles.addReqBtn, { backgroundColor: activeColor }]}>
                      <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                      <Text style={styles.addReqBtnText}>NEW PAYMENT</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {loadingPayments ? (
                  <ActivityIndicator size="small" color={activeColor} />
                ) : payments && payments.length > 0 ? (
                  payments.map((p: any) => (
                    <GlassCard key={p.id} style={styles.kpiDetailCard}>
                      <View style={styles.badgeRow}>
                        <Text style={[styles.activityName, isDark ? styles.darkText : styles.lightText]}>{p.description || 'Project Payout'}</Text>
                        <Text style={styles.lpoAmount}>{p.amount?.toLocaleString() || '0'} TZS</Text>
                      </View>
                      <Text style={styles.activityDesc}>Recipient: {p.technician?.name || p.paidTo || 'General Contract'}</Text>
                      <View style={[styles.badgeRow, { marginTop: 6 }]}>
                        <Text style={styles.activityMeta}>Date: {p.date}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          <View style={[styles.statusBadge, styles.activeBg]}>
                            <Text style={styles.statusText}>{p.status || 'Paid'}</Text>
                          </View>
                          {p.status !== 'Paid' && hasPermission('payment:approve') && (
                            <TouchableOpacity onPress={() => handleApprovePayment(p.id)} style={styles.rowActionBtn}>
                              <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
                            </TouchableOpacity>
                          )}
                          {hasPermission('finance:delete') && (
                            <TouchableOpacity onPress={() => handleDeletePayment(p.id)} style={styles.rowActionBtn}>
                              <MaterialCommunityIcons name="delete" size={18} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </GlassCard>
                  ))
                ) : (
                  <GlassCard style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="cash-multiple" size={40} color="#94a3b8" />
                    <Text style={styles.emptyText}>No payments logged on this project.</Text>
                  </GlassCard>
                )}
              </View>
            )}

            {/* Expenses List */}
            {financeTab === 'expenses' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Project Expenses</Text>
                  {hasPermission('expense:create') && (
                    <TouchableOpacity onPress={() => setShowExpenseModal(true)} style={[styles.addReqBtn, { backgroundColor: activeColor }]}>
                      <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                      <Text style={styles.addReqBtnText}>NEW EXPENSE</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {loadingExpenses ? (
                  <ActivityIndicator size="small" color={activeColor} />
                ) : expenses && expenses.length > 0 ? (
                  expenses.map((exp: any) => (
                    <GlassCard key={exp.id} style={styles.kpiDetailCard}>
                      <View style={styles.badgeRow}>
                        <Text style={[styles.activityName, isDark ? styles.darkText : styles.lightText]}>{exp.description}</Text>
                        <Text style={styles.lpoAmount}>{exp.amount?.toLocaleString() || '0'} TZS</Text>
                      </View>
                      <Text style={styles.activityDesc}>Category: {exp.category?.name || 'General Expense'}</Text>
                      <View style={[styles.badgeRow, { marginTop: 6 }]}>
                        <Text style={styles.activityMeta}>Date: {exp.date}</Text>
                        {hasPermission('finance:delete') && (
                          <TouchableOpacity onPress={() => handleDeleteExpense(exp.id)} style={styles.rowActionBtn}>
                            <MaterialCommunityIcons name="delete" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </GlassCard>
                  ))
                ) : (
                  <GlassCard style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="file-percent-outline" size={40} color="#94a3b8" />
                    <Text style={styles.emptyText}>No expenses logged.</Text>
                  </GlassCard>
                )}
              </View>
            )}

            {/* MY SITE FUND — cash received for this project vs. what I've spent */}
            {financeTab === 'sitefund' && (
              <View>
                {loadingSiteFund ? (
                  <ActivityIndicator size="small" color={activeColor} />
                ) : siteFundError ? (
                  <GlassCard style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="cash-remove" size={40} color="#94a3b8" />
                    <Text style={styles.emptyText}>You are not assigned as a storekeeper on this project.</Text>
                  </GlassCard>
                ) : siteFund ? (
                  <View>
                    <View style={styles.fundStatsRow}>
                      <GlassCard style={styles.fundStatCard}>
                        <Text style={styles.fundStatLabel}>Received</Text>
                        <Text style={[styles.fundStatValue, { color: '#16a34a' }]}>
                          {siteFund.received?.toLocaleString() || 0}
                        </Text>
                      </GlassCard>
                      <GlassCard style={styles.fundStatCard}>
                        <Text style={styles.fundStatLabel}>Spent</Text>
                        <Text style={[styles.fundStatValue, { color: '#f97316' }]}>
                          {siteFund.spent?.toLocaleString() || 0}
                        </Text>
                      </GlassCard>
                      <GlassCard style={styles.fundStatCard}>
                        <Text style={styles.fundStatLabel}>Balance</Text>
                        <Text style={[styles.fundStatValue, { color: siteFund.balance < 0 ? '#dc2626' : activeColor }]}>
                          {siteFund.balance?.toLocaleString() || 0}
                        </Text>
                      </GlassCard>
                    </View>

                    <View style={styles.sectionHeaderRow}>
                      <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Money Received</Text>
                      <TouchableOpacity onPress={() => refetchSiteFund()} style={styles.rowActionBtn}>
                        <MaterialCommunityIcons name="refresh" size={18} color={activeColor} />
                      </TouchableOpacity>
                    </View>
                    {siteFund.disbursements && siteFund.disbursements.length > 0 ? (
                      siteFund.disbursements.map((d: any) => (
                        <GlassCard key={d.id} style={styles.kpiDetailCard}>
                          <View style={styles.badgeRow}>
                            <Text style={[styles.activityName, isDark ? styles.darkText : styles.lightText]}>
                              {d.amount?.toLocaleString() || 0} TZS
                            </Text>
                            <Text style={styles.activityMeta}>{d.date}</Text>
                          </View>
                          <Text style={styles.activityDesc}>
                            Method: {(d.method || 'cash').replace('_', ' ')} · By: {d.disbursedBy ? `${d.disbursedBy.firstName} ${d.disbursedBy.lastName}` : '—'}
                          </Text>
                        </GlassCard>
                      ))
                    ) : (
                      <GlassCard style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="clock-outline" size={40} color="#94a3b8" />
                        <Text style={styles.emptyText}>No funds received yet for this project.</Text>
                      </GlassCard>
                    )}

                    {siteFund.expenseBreakdown && siteFund.expenseBreakdown.length > 0 && (
                      <>
                        <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText, { marginTop: 16, marginBottom: 8 }]}>
                          Spending Breakdown
                        </Text>
                        {siteFund.expenseBreakdown.map((b: any) => (
                          <View key={b.category} style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, isDark ? styles.darkText : styles.lightText]}>{b.category}</Text>
                            <Text style={styles.breakdownValue}>{b.amount?.toLocaleString()} TZS</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* TEAM & TECHNICIANS TAB */}
        {activeTab === 'team' && (
          <View style={styles.tabContentSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Assigned Staff Members</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(true)} style={[styles.addReqBtn, { backgroundColor: activeColor }]}>
                <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                <Text style={styles.addReqBtnText}>ASSIGN TEAM</Text>
              </TouchableOpacity>
            </View>

            {loadingTeam ? (
              <ActivityIndicator size="small" color={activeColor} />
            ) : projectTeam && projectTeam.length > 0 ? (
              projectTeam.map((m: any) => (
                <GlassCard key={m.id} style={styles.kpiDetailCard}>
                  <Text style={[styles.activityName, isDark ? styles.darkText : styles.lightText]}>{m.user?.firstName} {m.user?.lastName}</Text>
                  <Text style={styles.activityDesc}>Project Role: {m.role || 'Supervisor'}</Text>
                </GlassCard>
              ))
            ) : (
              <GlassCard style={styles.emptyContainer}>
                <MaterialCommunityIcons name="account-multiple-remove-outline" size={40} color="#94a3b8" />
                <Text style={styles.emptyText}>No assigned team members.</Text>
              </GlassCard>
            )}

            <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText, { marginTop: 20 }]}>Assigned Technicians</Text>
            {loadingProjTechs ? (
              <ActivityIndicator size="small" color={activeColor} />
            ) : projectTechs && projectTechs.length > 0 ? (
              projectTechs.map((t: any) => (
                <GlassCard key={t.id} style={styles.kpiDetailCard}>
                  <Text style={[styles.activityName, isDark ? styles.darkText : styles.lightText]}>{t.name}</Text>
                  <Text style={styles.activityDesc}>Trade: {t.category?.name || 'Technician'}</Text>
                </GlassCard>
              ))
            ) : (
              <GlassCard style={styles.emptyContainer}>
                <MaterialCommunityIcons name="account-wrench" size={40} color="#94a3b8" />
                <Text style={styles.emptyText}>No assigned technicians.</Text>
              </GlassCard>
            )}
          </View>
        )}

        {/* GALLERY TAB */}
        {activeTab === 'gallery' && (
          <View style={styles.tabContentSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Project Media Canvas</Text>
              <TouchableOpacity onPress={() => setShowGalleryModal(true)} style={[styles.addReqBtn, { backgroundColor: activeColor }]}>
                <MaterialCommunityIcons name="camera" size={16} color="#fff" />
                <Text style={styles.addReqBtnText}>ADD PHOTO</Text>
              </TouchableOpacity>
            </View>

            {loadingGallery ? (
              <ActivityIndicator size="small" color={activeColor} />
            ) : galleryItems && galleryItems.length > 0 ? (
              <View style={styles.galleryGrid}>
                {galleryItems.map((photo: any) => (
                  <TouchableOpacity key={photo.id} onPress={() => setSelectedPhoto(resolveMediaUrl(photo.media?.filename) || null)} style={styles.galleryWrapper}>
                    <Image source={{ uri: resolveMediaUrl(photo.media?.filename) }} style={styles.galleryImg} />
                    <Text style={styles.galleryImgLabel} numberOfLines={1}>{photo.caption || photo.media?.title || 'Untitled'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <GlassCard style={styles.emptyContainer}>
                <MaterialCommunityIcons name="image-multiple-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyText}>No project media photos found.</Text>
              </GlassCard>
            )}
          </View>
        )}
      </ScrollView>

      {/* NEW REQUISITION MODAL */}
      <Modal visible={showReqModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard variant="solid" style={styles.modalCard}>
            <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>New Requisition Note</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <CustomInput label="Site Location" placeholder="e.g. airport site" value={reqSiteLocation} onChangeText={setReqSiteLocation} />
              <CustomInput label="Your Designation" placeholder="e.g. Site supervisor" value={reqDesignation} onChangeText={setReqDesignation} />
              <CustomInput label="Notes" placeholder="e.g. materials needed for wall structure" value={reqNotes} onChangeText={setReqNotes} />

              <Text style={styles.itemTitle}>Materials Request List</Text>
              {reqItems.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <SearchableDropdown
                    label={`Product ${idx + 1} *`}
                    options={productOptions}
                    selectedValue={item.productId}
                    onSelect={(val) => {
                      const selectedProd = products?.find((p: any) => p.id === val);
                      const copy = [...reqItems];
                      copy[idx].productId = val;
                      if (selectedProd) {
                        copy[idx].description = selectedProd.name;
                        copy[idx].unit = selectedProd.uom?.name || 'pcs';
                      }
                      setReqItems(copy);
                    }}
                    placeholder="Select product..."
                    style={{ flex: 1.8 }}
                  />
                  <View style={{ flex: 1.2, marginLeft: 8 }}>
                    <CustomInput
                      label="Quantity"
                      placeholder="Qty"
                      keyboardType="numeric"
                      value={item.quantity}
                      onChangeText={(val) => {
                        const copy = [...reqItems];
                        copy[idx].quantity = val;
                        setReqItems(copy);
                      }}
                    />
                    {item.unit ? (
                      <Text style={{ fontSize: 10, color: '#64748b', marginTop: -12, textAlign: 'right' }}>
                        Unit: {item.unit}
                      </Text>
                    ) : null}
                  </View>
                  {reqItems.length > 1 && (
                    <TouchableOpacity
                      onPress={() => {
                        const copy = [...reqItems];
                        copy.splice(idx, 1);
                        setReqItems(copy);
                      }}
                      style={{ marginTop: 10, marginLeft: 8 }}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity
                onPress={() => setReqItems([...reqItems, { productId: '', description: '', unit: '', quantity: '0' }])}
                style={styles.addItemBtn}
              >
                <MaterialCommunityIcons name="plus" size={16} color={activeColor} />
                <Text style={[styles.addItemBtnText, { color: activeColor }]}>ADD ANOTHER ITEM</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalActions}>
              <CustomButton title="CANCEL" variant="outline" onPress={() => setShowReqModal(false)} style={{ flex: 1 }} />
              <CustomButton title="SAVE REQUISITION" onPress={handleCreateRequisition} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* REQUISITION DETAIL & WORKFLOW MODAL */}
      {selectedReq && (
        <Modal visible={!!selectedReq} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <GlassCard variant="solid" style={styles.modalCard}>
              <View style={[styles.badgeRow, { marginBottom: 6 }]}>
                <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText, { flex: 1, marginBottom: 0 }]}>
                  RN #{selectedReq.requisitionNo || selectedReq.id.substring(0,8)}
                </Text>
                <TouchableOpacity onPress={() => setSelectedReq(null)} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text style={styles.activityDesc}>Location: {selectedReq.siteLocation || 'Site'}</Text>
              
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380, marginTop: 10 }}>
                {/* Workflow Status Tracker timeline */}
                <Text style={styles.itemTitle}>Workflow Timeline Status</Text>
                <View style={styles.statusTimeline}>
                  <View style={[styles.timelineNode, selectedReq.status !== 'draft' && styles.timelineNodeDone]}>
                    <MaterialCommunityIcons name="file-document-edit" size={16} color={activeColor} />
                    <Text style={styles.timelineLabel}>Draft</Text>
                  </View>
                  <View style={[styles.timelineNode, (selectedReq.status === 'submitted' || selectedReq.status === 'reviewed' || selectedReq.status === 'approved' || selectedReq.status === 'issued') && styles.timelineNodeDone]}>
                    <MaterialCommunityIcons name="send" size={16} color={activeColor} />
                    <Text style={styles.timelineLabel}>Sent</Text>
                  </View>
                  <View style={[styles.timelineNode, (selectedReq.status === 'reviewed' || selectedReq.status === 'approved' || selectedReq.status === 'issued') && styles.timelineNodeDone]}>
                    <MaterialCommunityIcons name="file-find" size={16} color={activeColor} />
                    <Text style={styles.timelineLabel}>Reviewed</Text>
                  </View>
                  <View style={[styles.timelineNode, (selectedReq.status === 'approved' || selectedReq.status === 'issued') && styles.timelineNodeDone]}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={activeColor} />
                    <Text style={styles.timelineLabel}>Approved</Text>
                  </View>
                  <View style={[styles.timelineNode, selectedReq.status === 'issued' && styles.timelineNodeDone]}>
                    <MaterialCommunityIcons name="package-variant-closed" size={16} color={activeColor} />
                    <Text style={styles.timelineLabel}>Issued</Text>
                  </View>
                </View>

                {selectedReq.status === 'rejected' && (
                  <View style={styles.rejectionNotice}>
                    <MaterialCommunityIcons name="alert-circle" size={18} color="#ef4444" />
                    <Text style={styles.rejectionText}>Rejected: {selectedReq.rejectionReason}</Text>
                  </View>
                )}

                {/* Items table requested */}
                <Text style={styles.itemTitle}>Requested Items List</Text>
                {selectedReq.items?.map((item: any, idx: number) => (
                  <View key={idx} style={styles.reqDetailItemRow}>
                    <Text style={[styles.reqDetailItemText, isDark ? styles.darkText : styles.lightText]}>{item.description}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.qtyText}>{item.quantityOrdered || item.quantity} Ordered</Text>
                      <Text style={[styles.qtyText, { color: '#059669' }]}>{item.quantityIssued || 0} Issued</Text>
                    </View>
                  </View>
                ))}

                {/* Workflow actions panel */}
                <Text style={styles.itemTitle}>Workflow Transitions</Text>
                <View style={styles.workflowRow}>
                  {canSubmitReq(selectedReq) && (
                    <TouchableOpacity onPress={() => setShowCommentModal({ visible: true, type: 'submit' })} style={[styles.wfChip, { backgroundColor: activeColor }]}>
                      <Text style={styles.wfChipText}>Submit</Text>
                    </TouchableOpacity>
                  )}
                  {canReviewReq(selectedReq) && (
                    <TouchableOpacity onPress={() => setShowCommentModal({ visible: true, type: 'review' })} style={[styles.wfChip, { backgroundColor: '#7c3aed' }]}>
                      <Text style={styles.wfChipText}>Review</Text>
                    </TouchableOpacity>
                  )}
                  {canApproveReq(selectedReq) && (
                    <TouchableOpacity onPress={() => setShowCommentModal({ visible: true, type: 'approve' })} style={[styles.wfChip, { backgroundColor: '#10b981' }]}>
                      <Text style={styles.wfChipText}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {canIssueReq(selectedReq) && (
                    <TouchableOpacity onPress={handleOpenIssueModal} style={[styles.wfChip, { backgroundColor: '#f59e0b' }]}>
                      <Text style={styles.wfChipText}>Issue Goods</Text>
                    </TouchableOpacity>
                  )}
                  {canRejectReq(selectedReq) && (
                    <TouchableOpacity onPress={() => setShowReasonModal({ visible: true, type: 'reject', title: 'Reject Requisition Note' })} style={[styles.wfChip, { backgroundColor: '#ef4444' }]}>
                      <Text style={styles.wfChipText}>Reject</Text>
                    </TouchableOpacity>
                  )}
                  {canCancelReq(selectedReq) && (
                    <TouchableOpacity onPress={() => setShowReasonModal({ visible: true, type: 'cancel', title: 'Cancel Requisition Note' })} style={[styles.wfChip, { backgroundColor: '#64748b' }]}>
                      <Text style={styles.wfChipText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                  {canDeleteReq(selectedReq) && hasPermission('requisition:delete') && (
                    <TouchableOpacity onPress={() => handleDeleteRequisition(selectedReq.id)} style={[styles.wfChip, { backgroundColor: '#b91c1c' }]}>
                      <Text style={styles.wfChipText}>Delete Draft</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Comments & Activity logs */}
                <Text style={styles.itemTitle}>Comments & Activity Logs</Text>
                <View style={styles.commentsList}>
                  {selectedReq.comments?.map((c: any, idx: number) => (
                    <View key={idx} style={styles.commentContainer}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>{c.user?.firstName || 'User'}</Text>
                        <Text style={styles.commentStep}>({c.step})</Text>
                        {c.isInternal && <Text style={styles.internalBadge}>Internal</Text>}
                      </View>
                      <Text style={styles.commentText}>{c.comment}</Text>
                    </View>
                  ))}
                  {!selectedReq.comments?.length && (
                    <Text style={styles.emptyText}>No activity comments recorded yet.</Text>
                  )}
                </View>

                <CustomInput label="Write Comment" placeholder="Enter comments here..." value={reqCommentText} onChangeText={setReqCommentText} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 }}>
                  <TouchableOpacity onPress={() => setReqCommentInternal(!reqCommentInternal)} style={styles.checkboxRow}>
                    <MaterialCommunityIcons name={reqCommentInternal ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={activeColor} />
                    <Text style={[styles.selectChipText, isDark ? styles.darkText : styles.lightText]}>Mark as Internal Note</Text>
                  </TouchableOpacity>
                </View>
                <CustomButton title="POST COMMENT" onPress={handleAddReqComment} style={{ marginTop: 8 }} />

              </ScrollView>
            </GlassCard>
          </View>
        </Modal>
      )}

      {/* REQUISITION ISSUE GOODS MODAL */}
      <Modal visible={showReqIssueModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard variant="solid" style={styles.modalCard}>
            <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>Issue Goods: RN #{selectedReq?.requisitionNo}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {issueItemsInput.map((item, idx) => (
                <View key={item.id} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(226, 232, 240, 0.4)', paddingBottom: 10 }}>
                  <Text style={[styles.reqDetailItemText, isDark ? styles.darkText : styles.lightText]}>{item.description}</Text>
                  <Text style={styles.activityDesc}>Ordered Quantity: {item.quantityOrdered} {item.unit || 'pcs'}</Text>
                  <CustomInput
                    label="Quantity to Issue"
                    placeholder="Enter issue count"
                    keyboardType="numeric"
                    value={item.quantityIssued}
                    onChangeText={(val) => {
                      const copy = [...issueItemsInput];
                      copy[idx].quantityIssued = val;
                      setIssueItemsInput(copy);
                    }}
                  />
                </View>
              ))}
              <CustomInput label="Issue Comment" placeholder="e.g. materials issued to supervisor" value={issueComment} onChangeText={setIssueComment} />
            </ScrollView>
            <View style={styles.modalActions}>
              <CustomButton title="CANCEL" variant="outline" onPress={() => setShowReqIssueModal(false)} style={{ flex: 1 }} />
              <CustomButton title="CONFIRM ISSUE" onPress={handleIssueRequisitionGoods} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* LPO DETAILS & WORKFLOW MODAL */}
      {selectedLpo && (
        <Modal visible={!!selectedLpo} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <GlassCard variant="solid" style={styles.modalCard}>
              <View style={[styles.badgeRow, { marginBottom: 6 }]}>
                <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText, { flex: 1, marginBottom: 0 }]}>
                  LPO #{selectedLpo.lpoNo || 'Draft'}
                </Text>
                <TouchableOpacity onPress={() => setSelectedLpo(null)} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text style={styles.activityDesc}>Supplier: {selectedLpo.supplier?.name || 'Local Supplier'}</Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380, marginTop: 10 }}>
                {/* LPO Timeline */}
                <Text style={styles.itemTitle}>Workflow Timeline Status</Text>
                <View style={styles.statusTimeline}>
                  <View style={[styles.timelineNode, selectedLpo.status !== 'draft' && styles.timelineNodeDone]}>
                    <MaterialCommunityIcons name="file-document-edit" size={16} color={activeColor} />
                    <Text style={styles.timelineLabel}>Draft</Text>
                  </View>
                  <View style={[styles.timelineNode, (selectedLpo.status === 'submitted' || selectedLpo.status === 'approved' || selectedLpo.status === 'sent' || selectedLpo.status === 'received') && styles.timelineNodeDone]}>
                    <MaterialCommunityIcons name="send" size={16} color={activeColor} />
                    <Text style={styles.timelineLabel}>Submitted</Text>
                  </View>
                  <View style={[styles.timelineNode, (selectedLpo.status === 'approved' || selectedLpo.status === 'sent' || selectedLpo.status === 'received') && styles.timelineNodeDone]}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={activeColor} />
                    <Text style={styles.timelineLabel}>Approved</Text>
                  </View>
                  <View style={[styles.timelineNode, (selectedLpo.status === 'sent' || selectedLpo.status === 'received') && styles.timelineNodeDone]}>
                    <MaterialCommunityIcons name="truck-delivery" size={16} color={activeColor} />
                    <Text style={styles.timelineLabel}>Sent</Text>
                  </View>
                  <View style={[styles.timelineNode, selectedLpo.status === 'received' && styles.timelineNodeDone]}>
                    <MaterialCommunityIcons name="clipboard-check" size={16} color={activeColor} />
                    <Text style={styles.timelineLabel}>Received</Text>
                  </View>
                </View>

                {/* Items requested and received */}
                <Text style={styles.itemTitle}>Purchase Items</Text>
                {selectedLpo.items?.map((item: any, idx: number) => (
                  <View key={idx} style={styles.reqDetailItemRow}>
                    <Text style={[styles.reqDetailItemText, isDark ? styles.darkText : styles.lightText]}>{item.description}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.qtyText}>{item.quantity} Ordered</Text>
                      <Text style={[styles.qtyText, { color: '#059669' }]}>{item.quantityReceived || 0} Received</Text>
                    </View>
                  </View>
                ))}

                {/* LPO Action Buttons */}
                <Text style={styles.itemTitle}>Workflow Transitions</Text>
                <View style={styles.workflowRow}>
                  {canSubmitLpo(selectedLpo) && (
                    <TouchableOpacity onPress={() => setShowCommentModal({ visible: true, type: 'submit-lpo' })} style={[styles.wfChip, { backgroundColor: activeColor }]}>
                      <Text style={styles.wfChipText}>Submit LPO</Text>
                    </TouchableOpacity>
                  )}
                  {canApproveLpo(selectedLpo) && (
                    <TouchableOpacity onPress={() => setShowCommentModal({ visible: true, type: 'approve-lpo' })} style={[styles.wfChip, { backgroundColor: '#10b981' }]}>
                      <Text style={styles.wfChipText}>Approve LPO</Text>
                    </TouchableOpacity>
                  )}
                  {canSendLpo(selectedLpo) && (
                    <TouchableOpacity onPress={() => setShowCommentModal({ visible: true, type: 'send-lpo' })} style={[styles.wfChip, { backgroundColor: '#7c3aed' }]}>
                      <Text style={styles.wfChipText}>Mark Sent</Text>
                    </TouchableOpacity>
                  )}
                  {canReceiveLpo(selectedLpo) && (
                    <TouchableOpacity onPress={handleOpenReceiveModal} style={[styles.wfChip, { backgroundColor: '#f59e0b' }]}>
                      <Text style={styles.wfChipText}>Receive Goods</Text>
                    </TouchableOpacity>
                  )}
                  {canCancelLpo(selectedLpo) && (
                    <TouchableOpacity onPress={() => setShowReasonModal({ visible: true, type: 'cancel-lpo', title: 'Cancel Purchase Order (LPO)' })} style={[styles.wfChip, { backgroundColor: '#ef4444' }]}>
                      <Text style={styles.wfChipText}>Cancel LPO</Text>
                    </TouchableOpacity>
                  )}
                  {canDeleteLpo(selectedLpo) && hasPermission('lpo:update') && (
                    <TouchableOpacity onPress={() => handleDeleteLpo(selectedLpo.id)} style={[styles.wfChip, { backgroundColor: '#b91c1c' }]}>
                      <Text style={styles.wfChipText}>Delete Draft</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Comments Activity */}
                <Text style={styles.itemTitle}>Comments & Activity Logs</Text>
                <View style={styles.commentsList}>
                  {selectedLpo.comments?.map((c: any, idx: number) => (
                    <View key={idx} style={styles.commentContainer}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>{c.user?.firstName || 'User'}</Text>
                        <Text style={styles.commentStep}>({c.step})</Text>
                        {c.isInternal && <Text style={styles.internalBadge}>Internal</Text>}
                      </View>
                      <Text style={styles.commentText}>{c.comment}</Text>
                    </View>
                  ))}
                  {!selectedLpo.comments?.length && (
                    <Text style={styles.emptyText}>No activity comments recorded yet.</Text>
                  )}
                </View>

                <CustomInput label="Write Comment" placeholder="Enter comments here..." value={lpoCommentText} onChangeText={setLpoCommentText} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 }}>
                  <TouchableOpacity onPress={() => setLpoCommentInternal(!lpoCommentInternal)} style={styles.checkboxRow}>
                    <MaterialCommunityIcons name={lpoCommentInternal ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={activeColor} />
                    <Text style={[styles.selectChipText, isDark ? styles.darkText : styles.lightText]}>Mark as Internal Note</Text>
                  </TouchableOpacity>
                </View>
                <CustomButton title="POST COMMENT" onPress={handleAddLpoComment} style={{ marginTop: 8 }} />

              </ScrollView>
            </GlassCard>
          </View>
        </Modal>
      )}

      {/* LPO RECEIVE GOODS MODAL */}
      <Modal visible={showLpoReceiveModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard variant="solid" style={styles.modalCard}>
            <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>Receive Goods: LPO #{selectedLpo?.lpoNo}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {receiveItemsInput.map((item, idx) => (
                <View key={item.id} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(226, 232, 240, 0.4)', paddingBottom: 10 }}>
                  <Text style={[styles.reqDetailItemText, isDark ? styles.darkText : styles.lightText]}>{item.description}</Text>
                  <Text style={styles.activityDesc}>Ordered Quantity: {item.quantity} {item.unit || 'pcs'}</Text>
                  <CustomInput
                    label="Quantity Received"
                    placeholder="Enter received count"
                    keyboardType="numeric"
                    value={item.quantityReceived}
                    onChangeText={(val) => {
                      const copy = [...receiveItemsInput];
                      copy[idx].quantityReceived = val;
                      setReceiveItemsInput(copy);
                    }}
                  />
                </View>
              ))}
              <CustomInput label="Receive Comment" placeholder="e.g. materials received at warehouse" value={receiveComment} onChangeText={setReceiveComment} />
            </ScrollView>
            <View style={styles.modalActions}>
              <CustomButton title="CANCEL" variant="outline" onPress={() => setShowLpoReceiveModal(false)} style={{ flex: 1 }} />
              <CustomButton title="RECORD RECEIPT" onPress={handleReceiveLpoGoods} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* WORKFLOW COMMENT DIALOG */}
      <Modal visible={showCommentModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.confirmBox}>
            <Text style={[styles.confirmTitle, isDark ? styles.darkText : styles.lightText]}>Execute Workflow Action</Text>
            <Text style={styles.confirmSub}>Would you like to add an optional comment to this action?</Text>
            <CustomInput label="Comments" placeholder="Enter details..." value={workflowComment} onChangeText={setWorkflowComment} />
            <View style={styles.modalActions}>
              <CustomButton title="CANCEL" variant="outline" onPress={() => setShowCommentModal({ visible: false, type: 'submit' })} style={{ flex: 1 }} />
              <CustomButton title="EXECUTE" onPress={handleExecuteWorkflow} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* WORKFLOW REASON DIALOG */}
      <Modal visible={showReasonModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.confirmBox}>
            <Text style={[styles.confirmTitle, isDark ? styles.darkText : styles.lightText]}>{showReasonModal.title}</Text>
            <Text style={styles.confirmSub}>Please provide a reason to complete this action *</Text>
            <CustomInput label="Reason / Notes" placeholder="Enter reason details..." value={workflowReason} onChangeText={setWorkflowReason} />
            <View style={styles.modalActions}>
              <CustomButton title="CANCEL" variant="outline" onPress={() => setShowReasonModal({ visible: false, type: 'reject', title: '' })} style={{ flex: 1 }} />
              <CustomButton title="SUBMIT ACTION" onPress={handleExecuteReasonWorkflow} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* NEW LPO MODAL */}
      <Modal visible={showLpoModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard variant="solid" style={styles.modalCard}>
            <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>New Local Purchase Order (LPO)</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <SearchableDropdown
                label="Select Supplier *"
                options={supplierOptions}
                selectedValue={lpoSupplierId}
                onSelect={setLpoSupplierId}
                placeholder="Choose Supplier..."
              />

              <SearchableDropdown
                label="Select Project Activity *"
                options={activityOptions}
                selectedValue={lpoActivityId}
                onSelect={setLpoActivityId}
                placeholder="Choose Activity..."
              />

              <SearchableDropdown
                label="Link to Requisition (Optional)"
                options={requisitionOptions}
                selectedValue={lpoRequisitionId}
                onSelect={handleSelectRequisitionForLpo}
                placeholder="Choose Requisition Note..."
              />

              <CustomInput label="Delivery Site Address" placeholder="e.g. Zanzibar airport" value={lpoDeliveryAddress} onChangeText={setLpoDeliveryAddress} />
              <CustomInput label="Payment Terms" placeholder="30 days net" value={lpoPaymentTerms} onChangeText={setLpoPaymentTerms} />
              <CustomInput label="Notes" placeholder="Delivery details" value={lpoNotes} onChangeText={setLpoNotes} />

              <Text style={styles.itemTitle}>Purchase Items</Text>
              {lpoItems.map((item, idx) => (
                <View key={idx} style={{ marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(226, 232, 240, 0.4)' }}>
                  <SearchableDropdown
                    label={`Product ${idx + 1} *`}
                    options={productOptions}
                    selectedValue={item.productId}
                    onSelect={(val) => {
                      const selectedProd = products?.find((p: any) => p.id === val);
                      const copy = [...lpoItems];
                      copy[idx].productId = val;
                      if (selectedProd) {
                        copy[idx].description = selectedProd.name;
                        copy[idx].unit = selectedProd.uom?.name || 'pcs';
                        copy[idx].unitPrice = (selectedProd.unitPrice || 0).toString();
                      }
                      setLpoItems(copy);
                    }}
                    placeholder="Select product..."
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <CustomInput
                        label="Quantity"
                        placeholder="Qty"
                        keyboardType="numeric"
                        value={item.quantity}
                        onChangeText={(val) => {
                          const copy = [...lpoItems];
                          copy[idx].quantity = val;
                          setLpoItems(copy);
                        }}
                      />
                      {item.unit ? (
                        <Text style={{ fontSize: 10, color: '#64748b', marginTop: -12 }}>
                          Unit: {item.unit}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <CustomInput
                        label="Unit Price (TZS)"
                        placeholder="TZS"
                        keyboardType="numeric"
                        value={item.unitPrice}
                        onChangeText={(val) => {
                          const copy = [...lpoItems];
                          copy[idx].unitPrice = val;
                          setLpoItems(copy);
                        }}
                      />
                    </View>
                    {lpoItems.length > 1 && (
                      <TouchableOpacity
                        onPress={() => {
                          const copy = [...lpoItems];
                          copy.splice(idx, 1);
                          setLpoItems(copy);
                        }}
                        style={{ marginTop: 10, marginLeft: 8 }}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => setLpoItems([...lpoItems, { productId: '', quantity: '0', unitPrice: '0', unit: '', description: '' }])}
                style={styles.addItemBtn}
              >
                <MaterialCommunityIcons name="plus" size={16} color={activeColor} />
                <Text style={[styles.addItemBtnText, { color: activeColor }]}>ADD ANOTHER ITEM</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalActions}>
              <CustomButton title="CANCEL" variant="outline" onPress={() => setShowLpoModal(false)} style={{ flex: 1 }} />
              <CustomButton title="SAVE LPO" onPress={handleCreateLpo} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* NEW PAYMENT MODAL */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard variant="solid" style={styles.modalCard}>
            <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>Record New Payment</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              
              <SearchableDropdown
                label="Activity *"
                options={activityOptions}
                selectedValue={payActivityId}
                onSelect={setPayActivityId}
                placeholder="Select activity..."
              />

              <SearchableDropdown
                label="Paid To (Technician) *"
                options={technicianOptions}
                selectedValue={payTechId}
                onSelect={setPayTechId}
                placeholder="Select technician..."
              />

              <CustomInput label="Description *" placeholder="Payment description" value={payDescription} onChangeText={setPayDescription} />
              <CustomInput label="Amount *" placeholder="e.g. 5,000,000" keyboardType="numeric" value={payAmount} onChangeText={setPayAmount} />
              <DatePickerInput label="Payment Date" value={payDate} onChange={setPayDate} />
              <DatePickerInput label="Due Date" value={payDueDate} onChange={setPayDueDate} />
            </ScrollView>

            <View style={styles.modalActions}>
              <CustomButton title="CANCEL" variant="outline" onPress={() => setShowPaymentModal(false)} style={{ flex: 1 }} />
              <CustomButton title="SAVE PAYMENT" onPress={handleCreatePayment} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* NEW EXPENSE MODAL */}
      <Modal visible={showExpenseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard variant="solid" style={styles.modalCard}>
            <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>Record New Expense</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              
              <SearchableDropdown
                label="Activity (Optional)"
                options={activityOptions}
                selectedValue={expActivityId}
                onSelect={setExpActivityId}
                placeholder="Select activity..."
              />

              <SearchableDropdown
                label="Category *"
                options={expenseCategoryOptions}
                selectedValue={expCategoryId}
                onSelect={setExpCategoryId}
                placeholder="Select category..."
              />

              <CustomInput label="Description *" placeholder="Expense details" value={expDescription} onChangeText={setExpDescription} />
              <CustomInput label="Amount (TZS) *" placeholder="e.g. 150,000" keyboardType="numeric" value={expAmount} onChangeText={setExpAmount} />
              <DatePickerInput label="Date *" value={expDate} onChange={setExpDate} />
              <CustomInput label="Notes" placeholder="Additional notes" value={expNotes} onChangeText={setExpNotes} />
            </ScrollView>

            <View style={styles.modalActions}>
              <CustomButton title="CANCEL" variant="outline" onPress={() => setShowExpenseModal(false)} style={{ flex: 1 }} />
              <CustomButton title="SAVE EXPENSE" onPress={handleCreateExpense} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* TEAM ASSIGNMENT MODAL */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard variant="solid" style={styles.modalCard}>
            <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>Assign Staff to Project</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <SearchableDropdown
                label="Select Team Member *"
                options={allUsersOptions}
                selectedValue={assignUserId}
                onSelect={setAssignUserId}
                placeholder="Search and select a user..."
              />

              <SearchableDropdown
                label="Designated Project Role"
                options={roleOptions}
                selectedValue={assignRole}
                onSelect={setAssignRole}
                placeholder="Select a role..."
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <CustomButton title="CANCEL" variant="outline" onPress={() => setShowAssignModal(false)} style={{ flex: 1 }} />
              <CustomButton title="ASSIGN MEMBER" onPress={handleAssignTeamMember} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* GALLERY PHOTO PICKER MODAL */}
      <Modal visible={showGalleryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard variant="solid" style={styles.modalCard}>
            <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>Attach Project Media Photo</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <CustomInput label="Photo Label / Title" placeholder="e.g. Ground Floor Cementing" value={galleryTitle} onChangeText={setGalleryTitle} />

              {galleryImage ? (
                <View style={styles.pickedImageWrap}>
                  <Image source={{ uri: galleryImage.uri }} style={styles.pickedImagePreview} />
                  <TouchableOpacity onPress={() => setGalleryImage(null)} style={styles.pickedImageRemove}>
                    <MaterialCommunityIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.pickImageRow}>
                  <TouchableOpacity onPress={() => handlePickGalleryImage('library')} style={[styles.pickImageBtn, { borderColor: activeColor }]}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={22} color={activeColor} />
                    <Text style={[styles.pickImageBtnText, { color: activeColor }]}>Choose from Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handlePickGalleryImage('camera')} style={[styles.pickImageBtn, { borderColor: activeColor }]}>
                    <MaterialCommunityIcons name="camera-outline" size={22} color={activeColor} />
                    <Text style={[styles.pickImageBtnText, { color: activeColor }]}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <CustomButton title="CANCEL" variant="outline" onPress={() => { setShowGalleryModal(false); setGalleryImage(null); setGalleryTitle(''); }} style={{ flex: 1 }} />
              <CustomButton
                title={uploadingGallery ? 'UPLOADING...' : 'INSERT INTO GALLERY'}
                onPress={handleAddGalleryItem}
                disabled={uploadingGallery || !galleryImage}
                style={{ flex: 1 }}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* STORE ISSUE TO TECHNICIAN MODAL */}
      <Modal visible={showStoreIssueModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard variant="solid" style={styles.modalCard}>
            <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>Issue Store Items to Technician</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <SearchableDropdown
                label="Select Technician *"
                options={technicianOptions}
                selectedValue={storeIssueTechId}
                onSelect={setStoreIssueTechId}
                placeholder="Choose Technician..."
              />

              <CustomInput
                label="Internal Notes"
                placeholder="e.g. tools distributed for ground work"
                value={storeIssueNotes}
                onChangeText={setStoreIssueNotes}
              />

              <Text style={styles.itemTitle}>Items to Distribute</Text>
              {storeIssueItems.map((item, idx) => {
                // filter options to exclude items selected in other rows
                const chosenElsewhere = storeIssueItems
                  .filter((_, subIdx) => subIdx !== idx)
                  .map(it => it.storeItemId);
                const filteredItemOptions = storeItemOptions.filter((o: any) => !chosenElsewhere.includes(o.value));

                return (
                  <View key={idx} style={{ marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(226, 232, 240, 0.4)' }}>
                    <SearchableDropdown
                      label={`Item ${idx + 1} *`}
                      options={filteredItemOptions}
                      selectedValue={item.storeItemId}
                      onSelect={(val) => {
                        const copy = [...storeIssueItems];
                        copy[idx].storeItemId = val;
                        setStoreIssueItems(copy);
                      }}
                      placeholder="Select store item..."
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <CustomInput
                        label="Quantity"
                        placeholder="Enter quantity"
                        keyboardType="numeric"
                        value={item.quantity}
                        onChangeText={(val) => {
                          const copy = [...storeIssueItems];
                          copy[idx].quantity = val;
                          setStoreIssueItems(copy);
                        }}
                        style={{ flex: 1, marginRight: 8 }}
                      />
                      {storeIssueItems.length > 1 && (
                        <TouchableOpacity
                          onPress={() => {
                            const copy = [...storeIssueItems];
                            copy.splice(idx, 1);
                            setStoreIssueItems(copy);
                          }}
                          style={{ marginTop: 15 }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={24} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              <TouchableOpacity
                onPress={() => setStoreIssueItems([...storeIssueItems, { storeItemId: '', quantity: '0' }])}
                style={styles.addItemBtn}
              >
                <MaterialCommunityIcons name="plus" size={16} color={activeColor} />
                <Text style={[styles.addItemBtnText, { color: activeColor }]}>ADD ANOTHER ITEM</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalActions}>
              <CustomButton title="CANCEL" variant="outline" onPress={() => setShowStoreIssueModal(false)} style={{ flex: 1 }} />
              <CustomButton title="CONFIRM ISSUE" onPress={handleCreateStoreIssue} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* FULLSCREEN LIGHTBOX OVERLAY */}
      {selectedPhoto && (
        <Modal visible={!!selectedPhoto} transparent animationType="fade">
          <TouchableOpacity activeOpacity={1} onPress={() => setSelectedPhoto(null)} style={styles.lightboxBg}>
            <Image source={{ uri: selectedPhoto }} style={styles.lightboxImg} />
            <Text style={styles.lightboxCloseText}>TAP ANYWHERE TO CLOSE</Text>
          </TouchableOpacity>
        </Modal>
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fundStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  fundStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14
  },
  fundStatLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  fundStatValue: {
    fontSize: 15,
    fontWeight: '800'
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)'
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '600'
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f97316'
  },
  screen: {
    flex: 1
  },
  container: {
    flex: 1,
    padding: 16
  },
  lightBg: {
    backgroundColor: '#f8fafc'
  },
  darkBg: {
    backgroundColor: '#0f172a'
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  tabContainer: {
    marginBottom: 16
  },
  tabScroll: {
    gap: 8,
    paddingRight: 16
  },
  tabButton: {
    backgroundColor: 'rgba(226, 232, 240, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  tabButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  tabButtonText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700'
  },
  tabButtonTextDark: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700'
  },
  tabButtonTextActive: {
    color: '#ffffff'
  },
  overviewSection: {
    width: '100%'
  },
  mainCard: {
    marginBottom: 16
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  codeBadge: {
    backgroundColor: 'rgba(26, 86, 219, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  codeText: {
    color: '#1a56db',
    fontWeight: '700',
    fontSize: 11
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20
  },
  activeBg: {
    backgroundColor: '#dcfce7'
  },
  closedBg: {
    backgroundColor: '#f1f5f9'
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534'
  },
  projectName: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10
  },
  descriptionText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600'
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2
  },
  infoCard: {
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8
  },
  infoCol: {
    marginLeft: 12
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600'
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 8,
    paddingTop: 12
  },
  tabContentSection: {
    width: '100%'
  },
  kpiDetailCard: {
    marginBottom: 12,
    padding: 12
  },
  activityName: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1
  },
  activityDesc: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600'
  },
  activityMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
    fontWeight: '600'
  },
  subSelectorRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(226, 232, 240, 0.4)',
    padding: 4,
    borderRadius: 8,
    marginBottom: 16
  },
  subSelectorRowDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)'
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  subTabBtnDark: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  subTabBtnActive: {
    backgroundColor: '#ffffff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },
  subTabText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600'
  },
  subTabTextDark: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  addReqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4
  },
  addReqBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800'
  },
  lpoAmount: {
    fontSize: 13.5,
    color: '#ef4444',
    fontWeight: '800'
  },
  qtyText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '800'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12.5,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16
  },
  modalCard: {
    maxHeight: '90%'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    color: '#64748b',
    textTransform: 'uppercase'
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
    gap: 4
  },
  addItemBtnText: {
    fontSize: 11,
    fontWeight: '700'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20
  },
  selectLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6
  },
  selectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  selectChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  selectChipActive: {
    backgroundColor: 'rgba(26, 86, 219, 0.1)',
    borderWidth: 1,
    borderColor: '#1a56db'
  },
  selectChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600'
  },
  selectChipTextActive: {
    color: '#1a56db',
    fontWeight: '700'
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600'
  },
  lightText: {
    color: '#0f172a'
  },
  darkText: {
    color: '#ffffff'
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  galleryWrapper: {
    width: (SCREEN_WIDTH - 48) / 3,
    marginBottom: 8
  },
  galleryImg: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    backgroundColor: '#f1f5f9'
  },
  galleryImgLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center'
  },
  pickImageRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 12
  },
  pickImageBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  pickImageBtnText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center'
  },
  pickedImageWrap: {
    marginBottom: 12,
    position: 'relative'
  },
  pickedImagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 10
  },
  pickedImageRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  lightboxBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  lightboxImg: {
    width: '95%',
    height: '70%',
    resizeMode: 'contain'
  },
  lightboxCloseText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 20
  },
  statusTimeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(241, 245, 249, 0.4)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8
  },
  timelineNode: {
    alignItems: 'center',
    opacity: 0.35,
    flex: 1
  },
  timelineNodeDone: {
    opacity: 1
  },
  timelineLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 4,
    color: '#1a56db'
  },
  reqDetailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.4)'
  },
  reqDetailItemText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1
  },
  commentsList: {
    backgroundColor: 'rgba(241, 245, 249, 0.4)',
    padding: 10,
    borderRadius: 8,
    gap: 10,
    marginVertical: 10
  },
  commentContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.4)',
    paddingBottom: 6
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  commentAuthor: {
    fontWeight: '800',
    fontSize: 11.5,
    color: '#1e293b'
  },
  commentStep: {
    fontSize: 9.5,
    color: '#64748b',
    fontWeight: '600'
  },
  internalBadge: {
    fontSize: 9,
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontWeight: '700'
  },
  commentText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500'
  },
  confirmBox: {
    width: '100%',
    padding: 20
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center'
  },
  confirmSub: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    fontWeight: '500'
  },
  rowActionBtn: {
    padding: 4
  },
  workflowRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10
  },
  wfChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  wfChipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4
  },
  rejectionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 10
  },
  rejectionText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
    flex: 1
  }
});
