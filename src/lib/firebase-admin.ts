import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        projectId: firebaseConfig.projectId,
      });

export const adminAuth = getAuth(adminApp);
