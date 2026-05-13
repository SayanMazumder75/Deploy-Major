import React from 'react'
import { FileText, Plus } from 'lucide-react';

const EmptyState = ({ onActionClick, title, description, buttonText }) => {
    return (
        <div className="flex flex-col items-center justify-center py-24 px-6 border-2 border-dashed border-slate-200 rounded-3xl min-h-[420px]">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-slate-400" strokeWidth={2} />
            </div>

            <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                {title}
            </h3>

            <p className="text-slate-500 text-center max-w-md mb-8 leading-relaxed">
                {description}
            </p>

            {buttonText && onActionClick && (
                <button
                    onClick={onActionClick}
                    className="inline-flex items-center gap-2 px-6 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200"                >
                    <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        {buttonText}
                    </span>

                    <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-200" />
                </button>
            )}
        </div>
    )
}

export default EmptyState