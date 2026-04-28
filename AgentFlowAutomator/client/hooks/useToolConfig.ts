/**
 * useToolConfig Hook
 * React hook for managing tool configurations with n8n credentials
 */

import { useState, useCallback, useEffect } from 'react';
import axios, { AxiosError } from 'axios';

export interface Tool {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  configured: boolean;
}

export interface ToolConfig {
  tool_id: string;
  credentials: string[];
  settings: Record<string, any>;
  created_at: string;
  status: string;
}

export interface TestResult {
  success: boolean;
  message: string;
  result?: any;
  error?: string;
}

interface UseToolConfigState {
  tools: Tool[];
  loading: boolean;
  error: string | null;
  testLoading: boolean;
  testResult: TestResult | null;
  lastUpdate: Date | null;
}

const API_BASE_URL = 'http://localhost:5000/api/tools';

export const useToolConfig = () => {
  const [state, setState] = useState<UseToolConfigState>({
    tools: [],
    loading: false,
    error: null,
    testLoading: false,
    testResult: null,
    lastUpdate: null,
  });

  // ==================== FETCH TOOLS ====================
  const fetchTools = useCallback(async (useCache = true) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await axios.get(`${API_BASE_URL}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.data.success) {
        setState(prev => ({
          ...prev,
          tools: response.data.tools || [],
          loading: false,
          lastUpdate: new Date(),
        }));
      } else {
        throw new Error(response.data.error || 'Failed to fetch tools');
      }
    } catch (error) {
      const errorMsg =
        error instanceof AxiosError
          ? error.response?.data?.error || error.message
          : String(error);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
    }
  }, []);

  // ==================== GET SINGLE TOOL ====================
  const getTool = useCallback(
    async (toolId: string): Promise<Tool | null> => {
      try {
        const response = await axios.get(`${API_BASE_URL}/${toolId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.data.success) {
          return response.data.tool;
        }
        return null;
      } catch (error) {
        const errorMsg =
          error instanceof AxiosError
            ? error.response?.data?.error || error.message
            : String(error);

        console.error(`Error fetching tool ${toolId}:`, errorMsg);
        return null;
      }
    },
    []
  );

  // ==================== SAVE CONFIGURATION ====================
  const saveToolConfig = useCallback(
    async (
      toolId: string,
      credentials: string[],
      settings: Record<string, any>
    ): Promise<boolean> => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const response = await axios.post(`${API_BASE_URL}/${toolId}/config`, {
          credentials,
          settings,
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.data.success) {
          // Update tool configured status
          setState(prev => ({
            ...prev,
            tools: prev.tools.map(tool =>
              tool.id === toolId ? { ...tool, configured: true } : tool
            ),
            loading: false,
          }));
          return true;
        } else {
          throw new Error(response.data.error || 'Failed to save configuration');
        }
      } catch (error) {
        const errorMsg =
          error instanceof AxiosError
            ? error.response?.data?.error || error.message
            : String(error);

        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMsg,
        }));
        return false;
      }
    },
    []
  );

  // ==================== GET CONFIGURATION ====================
  const getToolConfig = useCallback(
    async (toolId: string): Promise<ToolConfig | null> => {
      try {
        const response = await axios.get(`${API_BASE_URL}/${toolId}/config`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.data.success) {
          return response.data.config;
        }
        return null;
      } catch (error) {
        const errorMsg =
          error instanceof AxiosError
            ? error.response?.data?.error || error.message
            : String(error);

        console.error(`Error fetching config for ${toolId}:`, errorMsg);
        return null;
      }
    },
    []
  );

  // ==================== DELETE CONFIGURATION ====================
  const deleteToolConfig = useCallback(async (toolId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await axios.delete(`${API_BASE_URL}/${toolId}/config`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.data.success) {
        setState(prev => ({
          ...prev,
          tools: prev.tools.map(tool =>
            tool.id === toolId ? { ...tool, configured: false } : tool
          ),
          loading: false,
        }));
        return true;
      } else {
        throw new Error(response.data.error || 'Failed to delete configuration');
      }
    } catch (error) {
      const errorMsg =
        error instanceof AxiosError
          ? error.response?.data?.error || error.message
          : String(error);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
      return false;
    }
  }, []);

  // ==================== TEST TOOL ====================
  const testToolConfig = useCallback(
    async (
      toolId: string,
      credentialId: string,
      settings: Record<string, any>
    ): Promise<TestResult> => {
      setState(prev => ({ ...prev, testLoading: true, testResult: null }));
      try {
        const response = await axios.post(
          `${API_BASE_URL}/${toolId}/test`,
          {
            credential_id: credentialId,
            settings,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        const result = response.data;
        setState(prev => ({
          ...prev,
          testLoading: false,
          testResult: result,
        }));
        return result;
      } catch (error) {
        const errorMsg =
          error instanceof AxiosError
            ? error.response?.data?.error || error.message
            : String(error);

        const result: TestResult = {
          success: false,
          message: 'Test failed',
          error: errorMsg,
        };

        setState(prev => ({
          ...prev,
          testLoading: false,
          testResult: result,
        }));
        return result;
      }
    },
    []
  );

  // ==================== CLEAR ERROR ====================
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearTestResult = useCallback(() => {
    setState(prev => ({ ...prev, testResult: null }));
  }, []);

  // Auto-fetch tools on mount
  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  return {
    // State
    tools: state.tools,
    loading: state.loading,
    error: state.error,
    testLoading: state.testLoading,
    testResult: state.testResult,
    lastUpdate: state.lastUpdate,

    // Methods
    fetchTools,
    getTool,
    saveToolConfig,
    getToolConfig,
    deleteToolConfig,
    testToolConfig,
    clearError,
    clearTestResult,
  };
};
