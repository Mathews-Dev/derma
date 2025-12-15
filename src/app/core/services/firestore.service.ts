import { inject, Injectable } from '@angular/core';
import { addDoc, collection, collectionData, deleteDoc, doc, DocumentData, DocumentReference, Firestore, getDoc, getDocs, query, setDoc, updateDoc, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore: Firestore = inject(Firestore);

  // METODOS GENERICOS
  getCollection<T>(path: string): Observable<T[]> {
    const collectionRef = collection(this.firestore, path);
    return collectionData(collectionRef, { idField: 'id' }) as Observable<T[]>;
  }

  async getDocumentById<T extends DocumentData>(path: string, docID: string): Promise<T | undefined> {
    const docRef = doc(this.firestore, path, docID);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() }) as T & { id: string } : undefined;
  }

  async getDocument<T>(path: string, docID: string): Promise<T | undefined> {
    const docRef = doc(this.firestore, path, docID);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as T) : undefined;
  }

  addDocument<T extends DocumentData>(path: string, data: T): Promise<DocumentReference> {
    const collectionRef = collection(this.firestore, path);
    return addDoc(collectionRef, data);
  }

  setDocument<T extends DocumentData>(path: string, docID: string, data: T): Promise<void> {
    const docRef = doc(this.firestore, path, docID);
    return setDoc(docRef, data);
  }

  updateDocument<T>(path: string, docID: string, data: Partial<T>): Promise<void> {
    const docRef = doc(this.firestore, path, docID);
    return updateDoc(docRef, data as { [key: string]: any });
  }

  deleteDocument(path: string, docID: string): Promise<void> {
    const docRef = doc(this.firestore, path, docID);
    return deleteDoc(docRef);
  }

  getCollectionByFilter<T>(path: string, fileName: string, value: string): Observable<T[]> {
    const collectionRef = collection(this.firestore, path);
    const q = query(collectionRef, where(fileName, "==", value));
    return collectionData(q, { idField: 'id' }) as Observable<T[]>;
  }

}