"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useState, useEffect } from "react";
import { database } from "@/lib/firebase";
import { ref, get, set } from "firebase/database";
import { Megaphone, Save } from "lucide-react";

export default function AdminAnnouncements() {
  const [announcement, setAnnouncement] = useState({
    text: "Welcome to KairoDocs! New updates have been pushed.",
    color: "#ffffff",
    bgColor: "#2563eb",
    speed: 50,
    isBold: false,
    isItalic: false,
    isUnderline: false,
    active: true,
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchA = async () => {
      const snap = await get(ref(database, "announcements/global"));
      if (snap.exists()) setAnnouncement(snap.val());
    }
    fetchA();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await set(ref(database, "announcements/global"), announcement);
      alert("Announcement updated globally!");
    } catch(e) {
      alert("Error saving announcement");
    } finally {
      setSaving(false);
    }
  }

  // Preview Styles
  const previewStyle = {
    color: announcement.color,
    backgroundColor: announcement.bgColor,
    fontWeight: announcement.isBold ? "bold" : "normal",
    fontStyle: announcement.isItalic ? "italic" : "normal",
    textDecoration: announcement.isUnderline ? "underline" : "none",
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="p-8 max-w-4xl mx-auto space-y-8 flex-1">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Global Announcements</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Configure the global ticker tape seen by users and mentors.</p>
        </header>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Current Announcement Edit
            </h2>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input 
                type="checkbox" 
                checked={announcement.active}
                onChange={(e) => setAnnouncement({...announcement, active: e.target.checked})}
                className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded"
              />
              Show Global Announcement
            </label>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message Text</label>
             <textarea 
               value={announcement.text}
               onChange={(e) => setAnnouncement({...announcement, text: e.target.value})}
               className="w-full rounded-lg border border-slate-300 p-3 h-24 focus:border-blue-500 focus:outline-none"
             />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {/* Colors */}
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Text Color</label>
                <input 
                  type="color" 
                  value={announcement.color}
                  onChange={(e) => setAnnouncement({...announcement, color: e.target.value})}
                  className="w-full h-10 p-1 border border-slate-300 rounded cursor-pointer"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Background Color</label>
                <input 
                  type="color" 
                  value={announcement.bgColor}
                  onChange={(e) => setAnnouncement({...announcement, bgColor: e.target.value})}
                  className="w-full h-10 p-1 border border-slate-300 rounded cursor-pointer"
                />
             </div>

             {/* Speed */}
             <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Scroll Speed: {announcement.speed}s</label>
                <input 
                  type="range" 
                  min="10" max="100" 
                  value={announcement.speed}
                  onChange={(e) => setAnnouncement({...announcement, speed: parseInt(e.target.value)})}
                  className="w-full mt-2"
                />
             </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={announcement.isBold} onChange={e => setAnnouncement({...announcement, isBold: e.target.checked})}/>
              <span className="font-bold">Bold</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={announcement.isItalic} onChange={e => setAnnouncement({...announcement, isItalic: e.target.checked})}/>
              <span className="italic">Italic</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={announcement.isUnderline} onChange={e => setAnnouncement({...announcement, isUnderline: e.target.checked})}/>
              <span className="underline">Underline</span>
            </label>
          </div>

          {/* Preview */}
          <div className="mt-8 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden relative" style={previewStyle}>
            <div className="w-full overflow-hidden py-3">
              <div 
                className="whitespace-nowrap"
                style={{ animation: `marquee ${announcement.speed}s linear infinite` }}
              >
                {announcement.text} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {announcement.text}
              </div>
            </div>
            {/* Simple local css injection just for preview */}
            <style jsx>{`
               @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
            `}</style>
          </div>

          <div className="pt-4 flex justify-end border-t border-slate-100 dark:border-slate-800/50">
             <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
             >
               <Save className="h-4 w-4" /> Save Configuration
             </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
