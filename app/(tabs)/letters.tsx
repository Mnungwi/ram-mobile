import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../src/core/services/api.service';
import { getLocalLetters, saveLettersToLocal, queueSyncAction } from '../../src/core/services/database.service';
import GlassCard from '../../src/components/GlassCard';
import CustomInput from '../../src/components/CustomInput';
import CustomButton from '../../src/components/CustomButton';
import SearchableDropdown from '../../src/components/SearchableDropdown';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

export default function LettersScreen() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);

  // Form Inputs
  const [subject, setSubject] = useState('');
  const [projectId, setProjectId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [toName, setToName] = useState('');
  const [toOrg, setToOrg] = useState('');
  const [toTitle, setToTitle] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [ccList, setCcList] = useState<any[]>([]);
  const [body, setBody] = useState('');

  const { isDark } = useAppTheme();

  // React Query Fetch Letters
  const { data: letters, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['letters'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/letters');
        const list = response.data?.rows || response.data?.data || response.data || [];
        await saveLettersToLocal(list); // cache locally
        setIsOffline(false);
        return list;
      } catch (err) {
        setIsOffline(true);
        const cached = await getLocalLetters();
        return cached;
      }
    }
  });

  // React Query Fetch Projects & Stakeholders
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const res = await apiClient.get('/projects');
      return res.data?.data?.rows || res.data?.data || res.data || [];
    }
  });

  const { data: projectStakeholders } = useQuery({
    queryKey: ['project-stakeholders', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await apiClient.get(`/projects/${projectId}/stakeholders`);
      return res.data?.stakeholders || res.data?.data?.stakeholders || res.data || [];
    },
    enabled: !!projectId
  });

  // Dropdown Options
  const projectOptions = [
    { value: '', label: 'General (No Project)' },
    ...(projects || []).map((p: any) => ({
      value: p.id,
      label: p.projectCode || p.name || 'Project',
      sublabel: p.name || ''
    }))
  ];

  const stakeholderOptions = (projectStakeholders || []).map((s: any) => {
    const sh = s.stakeholder || s;
    return {
      value: sh.id || s.stakeholderId,
      label: sh.name || '',
      sublabel: s.role || sh.jobTitle || 'Stakeholder'
    };
  });

  const getCcOptions = (idx: number) => {
    const chosenElsewhere = ccList
      .filter((_, i) => i !== idx)
      .map(cc => cc.id);
    return stakeholderOptions.filter((o: any) => o.value !== recipientId && !chosenElsewhere.includes(o.value));
  };

  const handleSelectRecipient = (stakeholderId: string) => {
    setRecipientId(stakeholderId);
    if (!stakeholderId) {
      setToName('');
      setToOrg('');
      setToTitle('');
      setToEmail('');
      return;
    }
    const ps = (projectStakeholders || []).find((s: any) => (s.stakeholder?.id === stakeholderId || s.stakeholderId === stakeholderId));
    if (ps) {
      const sh = ps.stakeholder || ps;
      setToName(sh.name || '');
      setToOrg(sh.organization || '');
      setToTitle(ps.role || sh.jobTitle || '');
      setToEmail(sh.email || '');
    }
  };

  const handleSelectCcStakeholder = (stakeholderId: string, idx: number) => {
    const copy = [...ccList];
    copy[idx].id = stakeholderId;
    if (!stakeholderId) {
      copy[idx].name = '';
      copy[idx].title = '';
      copy[idx].email = '';
      setCcList(copy);
      return;
    }
    const ps = (projectStakeholders || []).find((s: any) => (s.stakeholder?.id === stakeholderId || s.stakeholderId === stakeholderId));
    if (ps) {
      const sh = ps.stakeholder || ps;
      copy[idx].name = sh.name || '';
      copy[idx].title = ps.role || sh.jobTitle || '';
      copy[idx].email = sh.email || '';
    }
    setCcList(copy);
  };

  const getFilteredLetters = () => {
    if (!letters) return [];
    return letters.filter((l: any) =>
      l.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.toName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.referenceNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleComposeLetter = async () => {
    if (!subject || !toName || !body) {
      Alert.alert('Required Fields', 'Please fill in the Subject, Recipient, and Letter Body.');
      return;
    }

    const payload = {
      projectId: projectId || null,
      recipientId: recipientId || null,
      subject,
      body,
      type: 'outgoing',
      priority: 'normal',
      letterDate: new Date().toISOString().split('T')[0],
      toName,
      toTitle,
      toOrg,
      toEmail,
      ccList: ccList.map(cc => cc.id ? cc.id : { name: cc.name, title: cc.title, email: cc.email }),
      status: 'Draft'
    };

    try {
      const endpoint = projectId ? `/projects/${projectId}/letters` : '/letters';
      if (isOffline) {
        await queueSyncAction('POST', endpoint, payload);
        Alert.alert('Offline Mode', 'Letter queued locally and will sync when you are online.');
      } else {
        await apiClient.post(endpoint, payload);
        Alert.alert('Success', 'Letter composed and uploaded successfully.');
      }

      setSubject('');
      setProjectId('');
      setRecipientId('');
      setToName('');
      setToOrg('');
      setToTitle('');
      setToEmail('');
      setCcList([]);
      setBody('');
      setShowComposeModal(false);
      refetch();
    } catch (err) {
      Alert.alert('Error', 'Failed to save letter.');
    }
  };

  const renderLetterItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/letters/[id]', params: { id: item.id } })}
    >
      <GlassCard style={styles.letterCard}>
        <View style={styles.cardHeader}>
          <View style={styles.refContainer}>
            <Text style={styles.refText}>{item.referenceNo || 'Draft - Auto-Ref'}</Text>
          </View>
          <View style={[styles.priorityBadge, item.priority === 'urgent' ? styles.badgeUrgent : styles.badgeNormal]}>
            <Text style={styles.priorityText}>{item.priority?.toUpperCase() || 'NORMAL'}</Text>
          </View>
        </View>

        <Text style={[styles.letterSubject, isDark ? styles.darkText : styles.lightText]}>
          {item.subject}
        </Text>

        <View style={styles.recipientRow}>
          <MaterialCommunityIcons name="account-arrow-right-outline" size={16} color="#64748b" />
          <Text style={styles.recipientText}>
            To: {item.toName} {item.toOrg ? `(${item.toOrg})` : ''}
          </Text>
        </View>

        <Text style={styles.bodySnippet} numberOfLines={3}>
          {item.body?.replace(/<[^>]*>/g, '')}
        </Text>
        
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{item.letterDate}</Text>
          <View style={[styles.statusTag, item.status === 'Sent' ? styles.statusSent : styles.statusDraft]}>
            <Text style={styles.statusTagText}>{item.status || 'Draft'}</Text>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      {/* Search Input */}
      <View style={styles.searchBarContainer}>
        <CustomInput
          label="Search Letters"
          placeholder="Search by subject, recipient, reference..."
          iconName="magnify"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Network Alert banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" />
          <Text style={styles.offlineBannerText}>Working Offline. Showing local letter register.</Text>
        </View>
      )}

      {/* List */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1a56db" />
        </View>
      ) : (
        <FlatList
          data={getFilteredLetters()}
          keyExtractor={(item) => item.id}
          renderItem={renderLetterItem}
          contentContainerStyle={styles.listContainer}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="email-open-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>No correspondence documents found.</Text>
            </View>
          }
        />
      )}

      {/* Floating compose button */}
      <TouchableOpacity
        onPress={() => setShowComposeModal(true)}
        style={styles.fab}
      >
        <MaterialCommunityIcons name="pencil-plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Compose Letter Form Modal */}
      {showComposeModal && (
        <View style={styles.modalOverlay}>
          <GlassCard variant="solid" style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>Compose Letter</Text>
              <TouchableOpacity onPress={() => setShowComposeModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <CustomInput label="Subject / Topic" placeholder="e.g. Request for site survey" value={subject} onChangeText={setSubject} />

              <SearchableDropdown
                label="Project"
                options={projectOptions}
                selectedValue={projectId}
                onSelect={(val) => {
                  setProjectId(val);
                  setRecipientId('');
                  setToName('');
                  setToOrg('');
                  setToTitle('');
                  setToEmail('');
                  setCcList([]);
                }}
                placeholder="Choose Project..."
              />

              {!!projectId && (
                <SearchableDropdown
                  label="Choose from Project Stakeholders"
                  options={stakeholderOptions}
                  selectedValue={recipientId}
                  onSelect={handleSelectRecipient}
                  placeholder="Choose Stakeholder..."
                />
              )}

              {(!projectId || !!recipientId) && (
                <>
                  <CustomInput
                    label="Recipient Name"
                    placeholder="e.g. John Doe"
                    value={toName}
                    onChangeText={setToName}
                    editable={!recipientId}
                  />
                  <CustomInput
                    label="Recipient Title / Position"
                    placeholder="e.g. Site Engineer"
                    value={toTitle}
                    onChangeText={setToTitle}
                    editable={!recipientId}
                  />
                  <CustomInput
                    label="Recipient Organization"
                    placeholder="e.g. Zanzibar Planning Dept"
                    value={toOrg}
                    onChangeText={setToOrg}
                    editable={!recipientId}
                  />
                  <CustomInput
                    label="Recipient Email"
                    placeholder="recipient@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={toEmail}
                    onChangeText={setToEmail}
                    editable={!recipientId}
                  />
                </>
              )}

              <View style={styles.ccHeaderRow}>
                <Text style={styles.itemTitle}>CC Recipients</Text>
                <TouchableOpacity
                  onPress={() => setCcList([...ccList, { id: '', name: '', title: '', email: '' }])}
                  style={styles.addItemBtn}
                >
                  <MaterialCommunityIcons name="plus" size={16} color="#1a56db" />
                  <Text style={[styles.addItemBtnText, { color: '#1a56db' }]}>ADD CC</Text>
                </TouchableOpacity>
              </View>

              {ccList.length === 0 && (
                <Text style={styles.ccEmptyText}>No CC recipients added</Text>
              )}

              {ccList.map((cc, idx) => (
                <View key={idx} style={styles.ccItem}>
                  <View style={styles.ccItemHeader}>
                    <Text style={styles.ccItemLabel}>CC Recipient {idx + 1}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        const copy = [...ccList];
                        copy.splice(idx, 1);
                        setCcList(copy);
                      }}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  {!!projectId && (
                    <SearchableDropdown
                      label="Choose CC from Project Stakeholders"
                      options={getCcOptions(idx)}
                      selectedValue={cc.id}
                      onSelect={(val) => handleSelectCcStakeholder(val, idx)}
                      placeholder="Choose Stakeholder..."
                    />
                  )}

                  {(!projectId || !!cc.id) && (
                    <>
                      <CustomInput
                        label="Name"
                        placeholder="Full name"
                        value={cc.name}
                        onChangeText={(val: string) => {
                          const copy = [...ccList];
                          copy[idx].name = val;
                          setCcList(copy);
                        }}
                        editable={!cc.id}
                      />
                      <CustomInput
                        label="Title / Position"
                        placeholder="Title / Position"
                        value={cc.title}
                        onChangeText={(val: string) => {
                          const copy = [...ccList];
                          copy[idx].title = val;
                          setCcList(copy);
                        }}
                        editable={!cc.id}
                      />
                      <CustomInput
                        label="Email"
                        placeholder="Email address"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={cc.email}
                        onChangeText={(val: string) => {
                          const copy = [...ccList];
                          copy[idx].email = val;
                          setCcList(copy);
                        }}
                        editable={!cc.id}
                      />
                    </>
                  )}
                </View>
              ))}

              <CustomInput
                label="Letter Body Text"
                placeholder="Dear Sir/Madam,..."
                multiline
                numberOfLines={6}
                style={{ height: 100, textAlignVertical: 'top' }}
                value={body}
                onChangeText={setBody}
              />
            </ScrollView>

            <CustomButton title="SEND CORRESPONDENCE" onPress={handleComposeLetter} style={{ marginTop: 12 }} />
          </GlassCard>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  lightBg: {
    backgroundColor: '#f8fafc'
  },
  darkBg: {
    backgroundColor: '#0f172a'
  },
  searchBarContainer: {
    padding: 16,
    paddingBottom: 0
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 6,
    gap: 8
  },
  offlineBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80
  },
  letterCard: {
    marginBottom: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  refContainer: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  refText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 11
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeUrgent: {
    backgroundColor: '#fee2e2'
  },
  badgeNormal: {
    backgroundColor: '#eff6ff'
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1e40af'
  },
  letterSubject: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10
  },
  recipientText: {
    color: '#64748b',
    fontSize: 12.5,
    fontWeight: '500'
  },
  bodySnippet: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10
  },
  dateText: {
    color: '#94a3b8',
    fontSize: 11
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  statusSent: {
    backgroundColor: '#dcfce7'
  },
  statusDraft: {
    backgroundColor: '#fef3c7'
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#1a56db',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 100
  },
  modalCard: {
    width: '100%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700'
  },
  lightText: {
    color: '#0f172a'
  },
  darkText: {
    color: '#ffffff'
  },
  ccHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase'
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  addItemBtnText: {
    fontSize: 11,
    fontWeight: '700'
  },
  ccEmptyText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10
  },
  ccItem: {
    marginTop: 10,
    marginBottom: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.4)'
  },
  ccItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  ccItemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  }
});
