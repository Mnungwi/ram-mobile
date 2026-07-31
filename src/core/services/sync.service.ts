import { apiClient } from './api.service';
import {
  getQueuedSyncActions, removeSyncAction,
  saveProjectsToLocal, saveLettersToLocal,
  saveTechniciansToLocal, saveStoreItemsToLocal,
  saveDirectoryUsersToLocal, saveDirectoryClientsToLocal,
  saveDirectorySuppliersToLocal
} from './database.service';

export const syncOfflineData = async (): Promise<{ success: boolean; executedCount: number }> => {
  try {
    const queue = await getQueuedSyncActions();
    if (queue.length === 0) {
      return { success: true, executedCount: 0 };
    }

    console.log(`Starting synchronization of ${queue.length} queued action(s)...`);
    let executedCount = 0;

    for (const action of queue) {
      const payload = action.payload ? JSON.parse(action.payload) : null;
      try {
        if (action.method === 'POST') {
          await apiClient.post(action.endpoint, payload);
        } else if (action.method === 'PUT') {
          await apiClient.put(action.endpoint, payload);
        } else if (action.method === 'DELETE') {
          await apiClient.delete(action.endpoint, { data: payload });
        }
        
        // Remove from queue after successful execution
        await removeSyncAction(action.id);
        executedCount++;
      } catch (err: any) {
        console.error(`Sync action ID ${action.id} failed:`, err);
        // If it's a validation error (e.g. 400 Bad Request), remove it from queue to avoid blockages
        if (err.response && err.response.status >= 400 && err.response.status < 500) {
          await removeSyncAction(action.id);
          console.warn(`Action ID ${action.id} deleted due to validation error (HTTP ${err.response.status})`);
        } else {
          // If it's a network/server issue (500, timeout), stop processing the queue and retry later
          return { success: false, executedCount };
        }
      }
    }

    console.log('Synchronization completed successfully.');
    return { success: true, executedCount };
  } catch (err) {
    console.error('Fatal error during synchronization:', err);
    return { success: false, executedCount: 0 };
  }
};

// Sync latest content from server and update local storage
export const fetchAndCacheAllData = async (): Promise<void> => {
  try {
    // 1. Fetch Projects
    const projectsRes = await apiClient.get('/projects');
    const projects = projectsRes.data?.data || projectsRes.data || [];
    await saveProjectsToLocal(projects);

    // 2. Fetch Letters
    const lettersRes = await apiClient.get('/letters');
    const letters = lettersRes.data?.data || lettersRes.data || [];
    await saveLettersToLocal(letters);

    // 3. Fetch Technicians
    const techsRes = await apiClient.get('/technicians');
    const techs = techsRes.data?.data?.technicians || techsRes.data?.data || [];
    await saveTechniciansToLocal(techs);

    // 4. Fetch Central Store Stock
    const storeRes = await apiClient.get('/store/central');
    const store = storeRes.data?.data || storeRes.data || [];
    await saveStoreItemsToLocal(store);

    // 5. Fetch Corporate Team (Users)
    const usersRes = await apiClient.get('/users');
    const users = usersRes.data?.data?.users || usersRes.data?.data || [];
    await saveDirectoryUsersToLocal(users);

    // 6. Fetch Clients
    const clientsRes = await apiClient.get('/clients');
    const clients = clientsRes.data?.data?.clients || clientsRes.data?.data || [];
    await saveDirectoryClientsToLocal(clients);

    // 7. Fetch Suppliers
    const suppliersRes = await apiClient.get('/suppliers');
    const suppliers = suppliersRes.data?.data?.suppliers || suppliersRes.data?.data || [];
    await saveDirectorySuppliersToLocal(suppliers);

    console.log('Successfully cached latest projects, letters, techs, store stock, and directories locally.');
  } catch (err) {
    console.warn('Failed to fetch and cache fresh data from server:', err);
  }
};
