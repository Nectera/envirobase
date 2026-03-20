"use client";

import { Phone, X } from "lucide-react";

interface CallConfirmModalProps {
  phoneNumber: string;
  contactName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CallConfirmModal({ phoneNumber, contactName, onConfirm, onCancel }: CallConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <Phone size={22} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Make Call?</h3>
          <p className="text-sm text-slate-500">
            {contactName ? (
              <>Call <span className="font-medium text-slate-700">{contactName}</span> at <span className="font-medium text-slate-700">{phoneNumber}</span>?</>
            ) : (
              <>Call <span className="font-medium text-slate-700">{phoneNumber}</span>?</>
            )}
          </p>
        </div>
        <div className="flex border-t border-slate-200">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition rounded-bl-2xl"
          >
            No
          </button>
          <div className="w-px bg-slate-200" />
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 transition rounded-br-2xl"
          >
            Yes, Call
          </button>
        </div>
      </div>
    </div>
  );
}
