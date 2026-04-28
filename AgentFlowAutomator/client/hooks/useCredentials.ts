/**
 * useCredentials.ts
 * React hook for managing n8n credentials
 * Provides easy credential fetching, filtering, and management
 */

import { useState, useCallback, useEffect } from 'react';

export interface Credential {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  nodesAccess?: any[];
}

export interface UseCredentialsOptions {
  autoFetch?: boolean;
  autoRefreshInterval?: number; // milliseconds
  onError?: (error: string) => void;
}

const API_BASE = 'http://localhost:5000/api/credentials';

export const useCredentials = (options: UseCredentialsOptions = {}) => {
  const {
    autoFetch = true,
    autoRefreshInterval = 0,
    onError = () => {},
  } = options;

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch all credentials
  const fetchCredentials = useCallback(async (useCache = true) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}?use_cache=${useCache}`);
      const data = await response.json();

      if (data.success) {
        setCredentials(data.credentials || []);
        setLastUpdate(new Date());
      } else {
        const errorMsg = data.error || 'Failed to fetch credentials';
        setError(errorMsg);
        onError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      onError(errorMsg);
      console.error('❌ Error fetching credentials:', err);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Fetch specific credential
  const fetchCredentialById = useCallback(async (credentialId: string) => {
    try {
      const response = await fetch(`${API_BASE}/${credentialId}`);
      const data = await response.json();

      if (data.success) {
        return data.credential as Credential;
      } else {
        throw new Error(data.error || 'Failed to fetch credential');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      onError(errorMsg);
      return null;
    }
  }, [onError]);

  // Get credentials by type
  const getCredentialsByType = useCallback((type: string): Credential[] => {
    return credentials.filter(c => c.type === type);
  }, [credentials]);

  // Filter credentials
  const filterCredentials = useCallback((predicate: (c: Credential) => boolean): Credential[] => {
    return credentials.filter(predicate);
  }, [credentials]);

  // Validate credential
  const validateCredential = useCallback(async (credentialId: string) => {
    try {
      const response = await fetch(`${API_BASE}/${credentialId}/validate`, {
        method: 'POST',
      });
      const data = await response.json();
      return data as { success: boolean; valid: boolean; message: string };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, valid: false, message: errorMsg };
    }
  }, []);

  // Delete credential
  const deleteCredential = useCallback(async (credentialId: string) => {
    try {
      const response = await fetch(`${API_BASE}/${credentialId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setCredentials(prev => prev.filter(c => c.id !== credentialId));
        return true;
      } else {
        throw new Error(data.error || 'Failed to delete credential');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      onError(errorMsg);
      return false;
    }
  }, [onError]);

  // Refresh cache
  const refreshCache = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/refresh-cache`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setCredentials(data.credentials || []);
        setLastUpdate(new Date());
        return true;
      } else {
        throw new Error(data.error || 'Failed to refresh cache');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      onError(errorMsg);
      return false;
    }
  }, [onError]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchCredentials();
    }
  }, [autoFetch, fetchCredentials]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchCredentials(true);
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchCredentials]);

  return {
    credentials,
    loading,
    error,
    lastUpdate,
    fetchCredentials,
    fetchCredentialById,
    getCredentialsByType,
    filterCredentials,
    validateCredential,
    deleteCredential,
    refreshCache,
  };
};

export default useCredentials;
