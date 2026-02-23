import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertTriangle, Activity } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

function App() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const processInvoice = async () => {
        if (!file) return;

        setLoading(true);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // VITE_API_URL set in Vercel to point to Render
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';
            const response = await axios.post(`${API_URL}/api/v1/process-invoice`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setResult(response.data);
        } catch (error) {
            console.error('Error processing invoice:', error);
            alert('Failed to process invoice.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans overflow-x-hidden">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header section */}
                <motion.div
                    className="glass-panel p-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                                InvoiceAI Cloud
                            </h1>
                            <p className="text-slate-500 mt-2 text-lg">Serverless Accounts Payable MVP</p>
                        </div>
                    </div>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Upload Section */}
                    <motion.div
                        className="glass-panel p-8 flex flex-col items-center justify-center space-y-6"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        <div className="w-full relative group cursor-pointer border-2 border-dashed border-slate-300 hover:border-primary bg-slate-50 hover:bg-blue-50 transition-colors rounded-2xl p-10 flex flex-col items-center justify-center min-h-[300px]">
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                                accept=".pdf,.png,.jpg,.jpeg"
                            />
                            <div className="bg-white p-4 rounded-full shadow-md mb-4 group-hover:scale-110 transition-transform text-primary">
                                <Upload size={32} />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-700">Drop your invoice here</h3>
                            <p className="text-slate-400 mt-2 text-center text-sm px-4">
                                Supports Digital PDF or Image (JPEG/PNG).<br /> Extracted cleanly via Groq & Python math constraint.
                            </p>

                            {file && (
                                <div className="mt-6 flex items-center bg-white px-4 py-2 rounded-lg shadow-sm w-full border border-slate-100">
                                    <FileText className="text-blue-500 mr-3" size={20} />
                                    <span className="truncate font-medium text-slate-600 text-sm">{file.name}</span>
                                </div>
                            )}
                        </div>

                        <button
                            className={clsx(
                                "w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center transition-all",
                                file && !loading ? "bg-gradient-to-r from-primary to-blue-600 text-white hover:shadow-xl hover:-translate-y-1" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                            )}
                            onClick={processInvoice}
                            disabled={!file || loading}
                        >
                            {loading ? (
                                <span className="flex items-center space-x-2">
                                    <Activity className="animate-spin" size={20} />
                                    <span>Processing with API...</span>
                                </span>
                            ) : (
                                "Process Invoice MVP"
                            )}
                        </button>
                    </motion.div>

                    {/* Results Section */}
                    <motion.div
                        className="glass-panel p-8 min-h-[400px] flex flex-col relative overflow-hidden"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <AnimatePresence mode="wait">
                            {!result && !loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex-1 flex flex-col items-center justify-center text-slate-400"
                                >
                                    <FileText size={48} className="mb-4 opacity-50" />
                                    <p className="text-lg text-center">Cloud Extraction Results<br />will appear here</p>
                                </motion.div>
                            )}

                            {loading && (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex-1 flex flex-col items-center justify-center space-y-6"
                                >
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-blue-100 border-t-primary rounded-full animate-spin"></div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-xl font-bold text-slate-700">Connecting to Render...</h3>
                                        <p className="text-slate-500">Pipeline: OCR → Groq → PostGres → API</p>
                                    </div>
                                </motion.div>
                            )}

                            {result && !loading && (
                                <motion.div
                                    key="result"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex-1 flex flex-col text-slate-700"
                                >
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                                        <h2 className="text-2xl font-bold text-slate-800">Extraction Results</h2>

                                        <div className={clsx(
                                            "flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm",
                                            result.status === 'auto_approved' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'
                                        )}>
                                            {result.status === 'auto_approved' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                            <span className="capitalize">{result.status.replace('_', ' ')}</span>
                                        </div>
                                    </div>

                                    <div className="mb-4 flex gap-4 text-xs font-semibold">
                                        <span className={clsx("px-2 py-1 rounded", result.validation?.math_valid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                            Math: {result.validation?.math_valid ? "Valid" : "Failed"}
                                        </span>
                                        <span className={clsx("px-2 py-1 rounded", result.validation?.schema_valid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                            Schema: {result.validation?.schema_valid ? "Valid" : "Failed"}
                                        </span>
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                            Confidence: {(result.confidence * 100).toFixed(1)}%
                                        </span>
                                    </div>

                                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Vendor</p>
                                                <p className="text-lg font-semibold mt-1 truncate">{result.structured_data?.vendor_name || 'Unknown'}</p>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Invoice No.</p>
                                                <p className="text-lg font-semibold mt-1 truncate">{result.structured_data?.invoice_number || 'Unknown'}</p>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-bl-full opacity-50 blur-2xl"></div>
                                            <p className="text-xs text-blue-500 uppercase font-bold tracking-wider">Computed Grand Total</p>
                                            <h3 className="text-4xl font-black text-blue-900 mt-2 tracking-tight">
                                                ${result.structured_data?.computed_grand_total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                            </h3>
                                        </div>

                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                                                <h4 className="font-bold text-slate-700">Line Items</h4>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {(result.structured_data?.line_items || []).map((item: any, i: number) => (
                                                    <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                                        <div className="flex-1 pr-4">
                                                            <p className="font-semibold text-slate-800 line-clamp-1">{item.description}</p>
                                                            <p className="text-sm text-slate-500 mt-1">{item.quantity} × ${item.unit_price}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-slate-700">${item.computed_total?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="text-center mt-2">
                                            <a href={result.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                                                View Original File on R2
                                            </a>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

export default App;
