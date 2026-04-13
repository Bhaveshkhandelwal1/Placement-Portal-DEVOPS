import { useState, useRef } from 'react';
import { FileText, Loader2, Sparkles, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI } from '../../lib/api';
import { extractTextFromPdf } from '../../lib/extractPdfText';

const formatMarkdown = (text: string) => {
  let html = text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-800">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-5 mb-3 text-gray-800 border-b border-gray-200 pb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4 text-indigo-700">$1</h1>');
  
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold text-gray-900">$1</strong>');
  
  html = html.replace(/^\* (.*$)/gim, '<ul class="list-none"><li class="ml-6 list-disc mb-1">$1</li></ul>');
  html = html.replace(/^- (.*$)/gim, '<ul class="list-none"><li class="ml-6 list-disc mb-1">$1</li></ul>');
  
  html = html.replace(/^\d+\.\s(.*$)/gim, '<ul class="list-none"><li class="ml-6 list-decimal mb-1">$1</li></ul>');
  
  return html;
};

export default function ResumeAnalyzer() {
  const [resumeText, setResumeText] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsReadingFile(true);
    setReport(null);
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith('.txt')) {
        const text = await file.text();
        setResumeText(text);
        toast.success('Loaded text file');
        return;
      }
      if (name.endsWith('.pdf')) {
        const text = await extractTextFromPdf(file);
        if (text.length < 80) {
          toast.error('Very little text found in this PDF. Try another export.');
        } else {
          toast.success('Extracted text from PDF');
        }
        setResumeText(text);
        return;
      }
      toast.error('Please upload a .pdf or .txt file.');
    } catch (err) {
      console.error(err);
      toast.error('Could not read that file. Try another file.');
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleAnalyze = async () => {
    if (resumeText.trim().length < 80) {
      toast.error('Could not find enough text. Please upload a valid resume.');
      return;
    }
    setIsLoading(true);
    setReport(null);
    try {
      const res = await studentAPI.analyzeResume({ resumeText: resumeText.trim() });
      if (res.data.success && res.data.report) {
        setReport(res.data.report);
        toast.success('Analysis ready');
      } else {
        toast.error(res.data.message || 'Analysis failed');
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string }; status?: number } }).response?.data
              ?.message
          : undefined;
      toast.error(msg || 'Could not analyze resume. Is GEMINI_API_KEY set on the server?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="print:hidden space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-indigo-600" />
            AI Resume Analyzer
          </h1>
          <p className="mt-2 text-gray-600 text-sm sm:text-base">
            Upload a <strong>PDF</strong> / <strong>.txt</strong> file. We send the extracted text to
            the server for an ATS-style review (requires Gemini on the backend).
          </p>
        </div>

        <div className="bg-white shadow rounded-lg border border-gray-100 p-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={handleFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadingFile || isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {isReadingFile ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload PDF / TXT
            </button>
          </div>

          {resumeText && (
            <p className="text-sm text-green-600 font-medium">
              Resume uploaded successfully. Ready to analyze.
            </p>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isLoading || isReadingFile}
            className="inline-flex items-center px-5 py-2.5 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Analyze resume
              </>
            )}
          </button>
        </div>
      </div>

      {report && (
        <div className="bg-white shadow rounded-lg border border-gray-100 p-6 print:border-none print:shadow-none print:p-0">
          <div className="flex justify-between items-center mb-4 print:hidden">
            <h2 className="text-lg font-semibold text-gray-900">Report</h2>
            <button 
              onClick={() => window.print()}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4 mr-2 text-gray-500" />
              Download as PDF
            </button>
          </div>
          <div className="hidden print:block mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Resume Analysis Report</h1>
            <p className="text-gray-500 mt-1">Generated by AI Resume Analyzer</p>
          </div>
          <div 
            className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed max-h-[640px] overflow-y-auto border border-gray-100 rounded-md p-4 bg-gray-50/50 print:max-h-none print:overflow-visible print:border-none print:bg-white print:p-0 print:text-base print:leading-normal"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(report) }}
          />
        </div>
      )}
    </div>
  );
}
