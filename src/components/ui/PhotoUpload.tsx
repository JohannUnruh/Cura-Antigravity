"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Trash2 } from "lucide-react";
import { storage } from "@/lib/firebase/config";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

interface PhotoUploadProps {
    existingPhotos?: string[];
    onPhotosChange: (urls: string[]) => void;
    folder: string; // z.B. "consultations", "skb-consultations", "lectures", "retreats"
    itemId?: string; // ID des Items (consultation, lecture, etc.)
}

export function PhotoUpload({ existingPhotos = [], onPhotosChange, folder, itemId }: PhotoUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);

        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                // Generate unique filename
                const timestamp = Date.now();
                const randomStr = Math.random().toString(36).substring(2, 15);
                const fileName = `${timestamp}_${randomStr}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                
                // Create storage reference
                const storageRef = ref(storage, `${folder}/${itemId || 'temp'}/${fileName}`);
                
                // Upload file
                const snapshot = await uploadBytes(storageRef, file);
                
                // Get download URL
                const downloadURL = await getDownloadURL(snapshot.ref);
                
                return downloadURL;
            });

            const newUrls = await Promise.all(uploadPromises);
            const updatedUrls = [...existingPhotos, ...newUrls];
            onPhotosChange(updatedUrls);
        } catch (error) {
            console.error("Error uploading photos:", error);
            alert("Fehler beim Hochladen der Fotos. Bitte versuche es erneut.");
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleDeletePhoto = async (photoUrl: string) => {
        if (!confirm("Möchtest du dieses Foto wirklich löschen?")) return;

        try {
            // Delete from storage
            const photoRef = ref(storage, photoUrl);
            await deleteObject(photoRef);

            // Update URLs
            const updatedUrls = existingPhotos.filter(url => url !== photoUrl);
            onPhotosChange(updatedUrls);
        } catch (error) {
            console.error("Error deleting photo:", error);
            alert("Fehler beim Löschen des Fotos.");
        }
    };

    const handleViewPhoto = (photoUrl: string) => {
        window.open(photoUrl, '_blank');
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Fotos & Dokumente
                </label>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Upload className="w-4 h-4" />
                    {uploading ? "Lädt hoch..." : "Foto hochladen"}
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
            />

            {existingPhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {existingPhotos.map((url, index) => (
                        <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
                            <img
                                src={url}
                                alt={`Foto ${index + 1}`}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => handleViewPhoto(url)}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleViewPhoto(url)}
                                    className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                                    title="Anzeigen"
                                >
                                    <ImageIcon className="w-4 h-4 text-gray-700" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeletePhoto(url)}
                                    className="p-2 bg-red-500/90 rounded-full hover:bg-red-500 transition-colors"
                                    title="Löschen"
                                >
                                    <Trash2 className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {existingPhotos.length === 0 && (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                >
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                        Klicke hier, um Fotos hochzuladen
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                        Unterstützte Formate: JPG, PNG, GIF
                    </p>
                </div>
            )}
        </div>
    );
}
