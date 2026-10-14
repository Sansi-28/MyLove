// ═══════════════════════════════════════════
// 🔥 Firebase Helpers — Real-time Cloud Sync
// ═══════════════════════════════════════════
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../config/firebase';

// Upload local image to Firebase Storage and return the public URL
export async function uploadImageToFirebase(localUri, folder = 'gallery') {
  if (!isFirebaseConfigured || !storage) {
    console.log('Firebase Storage not yet configured, using local URI fallback');
    return localUri;
  }

  try {
    const response = await fetch(localUri);
    const blob = await response.blob();

    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, filename);

    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    console.log('☁️ Uploaded to Firebase Storage:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Firebase upload failed:', error?.message);
    return localUri;
  }
}
