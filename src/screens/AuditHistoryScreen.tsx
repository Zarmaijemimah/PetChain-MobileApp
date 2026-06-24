/**
 * Audit History Screen — displays all access and modifications to medical records (HIPAA-equivalent compliance)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';

import type { AuditLog, AuditLogQuery } from '../services/auditService';
import {
  getAuditLogs,
  getAuditActionIcon,
  getAuditActionLabel,
} from '../services/auditService';

interface AuditHistoryScreenProps {
  route?: {
    params?: {
      resourceId?: string;
      resourceType?: 'medical_record' | 'pet' | 'appointment';
    };
  };
}

export const AuditHistoryScreen: React.FC<AuditHistoryScreenProps> = ({ route }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const resourceId = route?.params?.resourceId;
  const resourceType = route?.params?.resourceType;

  useEffect(() => {
    fetchAuditLogs();
  }, [resourceId, resourceType, page]);

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const query: AuditLogQuery = {
        page,
        limit: 20,
      };

      if (resourceId) query.resourceId = resourceId;
      if (resourceType) query.resourceType = resourceType as any;

      const response = await getAuditLogs(query);
      setAuditLogs(response.data.data);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit history');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !isLoading) {
      setPage(page + 1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const renderAuditItem = ({ item }: { item: AuditLog }) => (
    <View style={styles.auditItem}>
      <View style={styles.auditHeader}>
        <Text style={styles.auditIcon}>{getAuditActionIcon(item.action)}</Text>
        <View style={styles.auditInfo}>
          <Text style={styles.auditAction}>{getAuditActionLabel(item.action)}</Text>
          <Text style={styles.auditEmail}>{item.actorEmail}</Text>
        </View>
      </View>
      <View style={styles.auditMeta}>
        <Text style={styles.auditTime}>{formatDate(item.createdAt)}</Text>
        {item.ipAddress && <Text style={styles.auditDetail}>IP: {item.ipAddress}</Text>}
        {item.resourceId && <Text style={styles.auditDetail}>ID: {item.resourceId}</Text>}
      </View>
      {item.meta && Object.keys(item.meta).length > 0 && (
        <View style={styles.auditMetaDetails}>
          {Object.entries(item.meta).map(([key, value]) => (
            <Text key={key} style={styles.metaDetail}>
              {key}: {String(value)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  if (error && auditLogs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAuditLogs}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Access History</Text>
        {resourceId && <Text style={styles.headerSubtitle}>Record: {resourceId}</Text>}
      </View>

      <FlatList
        data={auditLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderAuditItem}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No access history found</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : null
        }
      />

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <Text style={styles.paginationText}>
            Page {page} of {totalPages}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 12,
  },
  auditItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  auditIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  auditInfo: {
    flex: 1,
  },
  auditAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  auditEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  auditMeta: {
    marginBottom: 8,
  },
  auditTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  auditDetail: {
    fontSize: 11,
    color: '#aaa',
    marginBottom: 2,
  },
  auditMetaDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  metaDetail: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  pagination: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  paginationText: {
    fontSize: 12,
    color: '#666',
  },
});

export default AuditHistoryScreen;
