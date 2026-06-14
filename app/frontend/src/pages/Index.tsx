import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { client } from '@/lib/api';
import { Upload, ArrowRight, Settings2 } from 'lucide-react';
import NavBar from '@/components/NavBar';
import {
  AnalysisResult,
  getAnalysisState,
  MatchResult,
  mergeAnalysisState,
  saveAnalysisState,
} from '@/lib/analysisState';

export default function Index() {
  const navigate = useNavigate();
  const [jdText, setJdText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/v1/analysis/config')
      .then((response) => response.json())
      .then((data) => setAiConfigured(Boolean(data.configured)))
      .catch(() => setAiConfigured(false));
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const hasJd = jdText.trim().length > 0;
  const hasPdf = pdfFile !== null;
  const canSubmit = hasJd || hasPdf;

  const getButtonText = () => {
    if (aiConfigured === false) return '请先配置 API';
    if (hasJd && hasPdf) return '开始匹配分析';
    if (hasJd) return '分析 JD 结构';
    if (hasPdf) return '分析简历结构';
    return '请输入内容';
  };

  const handleAnalyze = async () => {
    if (aiConfigured === false) {
      navigate('/ai-config');
      return;
    }
    if (!canSubmit) {
      toast.error('请至少输入岗位 JD 或上传简历 PDF');
      return;
    }

    setLoading(true);
    try {
      let pdfBase64: string | undefined;
      if (pdfFile) {
        pdfBase64 = await fileToBase64(pdfFile);
      }

      const requestData: Record<string, string> = {};
      if (hasJd) requestData.jd_text = jdText;
      if (pdfBase64) requestData.pdf_base64 = pdfBase64;

      const response = await client.apiCall.invoke({
        url: '/api/v1/analysis/analyze',
        method: 'POST',
        data: requestData,
        options: {
          timeout: 600_000,
        },
      });

      const incoming = response.data as AnalysisResult;
      let nextState = mergeAnalysisState(getAnalysisState(), incoming, {
        jdText: hasJd ? jdText.trim() : undefined,
        resumeFileName: pdfFile?.name,
      });

      if (
        !incoming.match_result &&
        nextState.jd_analysis &&
        nextState.resume_analysis
      ) {
        try {
          const matchResponse = await fetch('/api/v1/analysis/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jd_analysis: nextState.jd_analysis,
              resume_analysis: nextState.resume_analysis,
            }),
          });
          const matchData = await matchResponse.json();
          if (!matchResponse.ok) {
            throw new Error(matchData?.detail || '匹配评分更新失败');
          }
          nextState = {
            ...nextState,
            match_result: matchData as MatchResult,
            match_updated_at: new Date().toISOString(),
          };
        } catch (matchError) {
          toast.warning(
            matchError instanceof Error
              ? `结构化结果已保存，但${matchError.message}`
              : '结构化结果已保存，但匹配评分更新失败',
          );
        }
      }

      saveAnalysisState(nextState);
      navigate('/results');
    } catch (e: any) {
      const detail = e?.data?.detail || e?.response?.data?.detail || e?.message || '分析失败，请重试';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('请上传 PDF 格式的文件');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('文件大小不能超过 10MB');
        return;
      }
      setPdfFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-morandi-bg">
      <NavBar />
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-base font-semibold text-morandi-text mb-1">
            匹配分析
          </h1>
          <p className="text-xs text-morandi-text-muted">
            输入岗位 JD 和/或上传简历 PDF，获取结构化分析与匹配评估。
          </p>
        </div>

        {aiConfigured === false && (
          <div className="mb-6 rounded-md border border-morandi-primary/20 bg-morandi-primary/5 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-morandi-text-secondary">
                分析服务尚未配置
              </p>
              <p className="text-[11px] text-morandi-text-muted mt-0.5">
                添加 OpenAI 兼容 API 后即可开始解析 JD 和简历。
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/ai-config')}
              className="shrink-0 text-xs text-morandi-primary hover:text-morandi-primary"
            >
              <Settings2 className="w-3.5 h-3.5 mr-1.5" />
              前往配置
            </Button>
          </div>
        )}

        {/* Two-column input */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* JD Input */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-xs font-medium text-morandi-text-secondary uppercase tracking-wide">
                岗位 JD
              </label>
              <span className="text-xs text-morandi-text-muted">可选</span>
            </div>
            <Textarea
              placeholder="粘贴岗位描述文本..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              className="min-h-[300px] bg-morandi-card border-morandi-card-alt text-morandi-text placeholder:text-morandi-text-muted resize-none text-sm leading-relaxed focus:border-morandi-primary focus:ring-1 focus:ring-morandi-primary/20"
            />
            <p className="text-xs text-morandi-text-muted mt-1.5">
              {jdText.length > 0 ? `${jdText.length} 字` : '包含职位要求、技能需求、工作职责'}
            </p>
          </div>

          {/* Resume Upload */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-xs font-medium text-morandi-text-secondary uppercase tracking-wide">
                简历 PDF
              </label>
              <span className="text-xs text-morandi-text-muted">可选</span>
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`min-h-[300px] border rounded-md flex flex-col items-center justify-center cursor-pointer transition-colors ${
                pdfFile
                  ? 'border-morandi-primary/40 bg-morandi-primary/5'
                  : 'border-morandi-card-alt bg-morandi-card hover:border-morandi-text-muted/30'
              }`}
            >
              {pdfFile ? (
                <div className="text-center px-4">
                  <p className="text-sm font-medium text-morandi-text mb-1">
                    {pdfFile.name}
                  </p>
                  <p className="text-xs text-morandi-text-secondary">
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-morandi-primary mt-3">点击更换</p>
                </div>
              ) : (
                <div className="text-center px-4">
                  <Upload className="w-5 h-5 text-morandi-text-muted mx-auto mb-2" />
                  <p className="text-sm text-morandi-text-secondary">
                    点击上传简历
                  </p>
                  <p className="text-xs text-morandi-text-muted mt-1">PDF 格式，最大 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center justify-between pt-4 border-t border-morandi-card-alt">
          <p className="text-xs text-morandi-text-muted">
            {hasJd && hasPdf
              ? '将执行完整匹配分析：JD 结构化 → 简历结构化 → 匹配评估'
              : hasJd
                ? '仅分析 JD 结构，可预览分析准确性'
                : hasPdf
                  ? '仅分析简历结构，可预览分析准确性'
                  : '至少提供一项输入即可开始分析'}
          </p>
          <Button
            onClick={handleAnalyze}
            disabled={loading || !canSubmit || aiConfigured !== true}
            className="bg-morandi-primary text-white hover:bg-morandi-primary/90 disabled:opacity-40 text-sm font-medium px-5"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                分析中...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                {getButtonText()}
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
