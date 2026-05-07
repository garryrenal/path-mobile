
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';

export enum AuditOperation {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout'
}

export interface AuditLogData {
  operation: AuditOperation;
  collectionName?: string;
  documentId?: string;
  details?: any;
}

export async function logAuditAction(data: AuditLogData) {
  const user = auth.currentUser;
  if (!user) return; 

  const path = 'audit_logs';
  try {
    const docRef = await addDoc(collection(db, path), {
      userId: user.uid,
      email: user.email,
      operation: data.operation,
      collection: data.collectionName || 'none',
      documentId: data.documentId || 'none',
      timestamp: serverTimestamp(),
      details: data.details || {}
    });
    return docRef;
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Suppress loops if handleFirestoreError also tries to log, 
    // but here it just throws a descriptive error.
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch (e) {
      console.warn('Audit log error suppressed from crashing app:', e);
    }
  }
}
