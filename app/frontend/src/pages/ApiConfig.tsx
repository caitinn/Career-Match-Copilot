import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiUrl } from '@/lib/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const GOOGLE_AI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/';
const MODEL_OPTIONS = ['gemini-2.5-flash', 'gemini-3.5-flash'] as const;

interface AIConfigStatus {
  configured: boolean;
  base_url: string | null;
  text_model: string | null;
  source: 'saved' | 'environment' | null;
}

const defaultStatus: AIConfigStatus = {
  configured: false,
  base_url: null,
  text_model: null,
  source: null,
};

export default function ApiConfig() {
  const [status, setStatus] = useState<AIConfigStatus>(defaultStatus);
  const [baseUrlMode, setBaseUrlMode] = useState<'google' | 'custom'>('google');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [textModel, setTextModel] =
    useState<(typeof MODEL_OPTIONS)[number]>('gemini-2.5-flash');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch(apiUrl('/api/v1/analysis/config'));
      if (!response.ok) throw new Error('无法读取 API 配置');
      const data: AIConfigStatus = await response.json();
      setStatus(data);
      const savedBaseUrl = data.base_url ?? '';
      if (
        savedBaseUrl &&
        savedBaseUrl.replace(/\/$/, '') !== GOOGLE_AI_BASE_URL.replace(/\/$/, '')
      ) {
        setBaseUrlMode('custom');
        setCustomBaseUrl(savedBaseUrl);
      } else {
        setBaseUrlMode('google');
      }
      if (MODEL_OPTIONS.includes(data.text_model as (typeof MODEL_OPTIONS)[number])) {
        setTextModel(data.text_model as (typeof MODEL_OPTIONS)[number]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '无法读取 API 配置');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const resolvedBaseUrl =
      baseUrlMode === 'google' ? GOOGLE_AI_BASE_URL : customBaseUrl.trim();
    if (!resolvedBaseUrl || (!status.configured && !apiKey.trim())) {
      toast.error(
        status.configured
          ? '请填写 API Base URL'
          : '首次配置请填写 API Base URL 和 API Key',
      );
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(apiUrl('/api/v1/analysis/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: resolvedBaseUrl,
          api_key: apiKey.trim() || null,
          text_model: textModel,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail?.[0]?.msg || data?.detail || '保存失败');
      }

      setStatus(data);
      setApiKey('');
      toast.success('API 配置已保存，可重复使用');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      const response = await fetch(apiUrl('/api/v1/analysis/config'), {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('清除配置失败');
      const data: AIConfigStatus = await response.json();
      setStatus(data);
      setBaseUrlMode('google');
      setCustomBaseUrl('');
      setTextModel('gemini-2.5-flash');
      setApiKey('');
      toast.success('已清除本地 API 配置');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '清除配置失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-morandi-bg">
      <NavBar />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-base font-semibold text-morandi-text mb-1">
            AI API 配置
          </h1>
          <p className="text-xs text-morandi-text-muted leading-relaxed">
            配置支持 OpenAI Chat Completions 协议。API Key 保存在本机后端的私有配置文件中，
            配置一次后可在后续打开页面时继续使用。
          </p>
        </div>

        <div className="rounded-lg border border-morandi-card-alt bg-morandi-card p-5 mb-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-morandi-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-morandi-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-morandi-text">连接状态</p>
                <p className="text-xs text-morandi-text-muted mt-0.5">
                  {loading
                    ? '正在读取配置'
                    : status.configured
                      ? `已配置 · ${status.text_model}`
                      : '尚未配置'}
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded ${
                status.configured
                  ? 'bg-morandi-success/10 text-morandi-success'
                  : 'bg-morandi-card-alt text-morandi-text-muted'
              }`}
            >
              {status.configured ? '可用' : '未连接'}
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="rounded-lg border border-morandi-card-alt bg-morandi-card p-5 space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="base-url-mode" className="text-xs text-morandi-text-secondary">
              API Base URL
            </Label>
            <Select
              value={baseUrlMode}
              onValueChange={(value) =>
                setBaseUrlMode(value as 'google' | 'custom')
              }
              disabled={loading || saving}
            >
              <SelectTrigger
                id="base-url-mode"
                className="bg-morandi-bg border-morandi-card-alt"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">
                  Google AI Studio · {GOOGLE_AI_BASE_URL}
                </SelectItem>
                <SelectItem value="custom">自定义 URL</SelectItem>
              </SelectContent>
            </Select>
            {baseUrlMode === 'custom' && (
              <Input
                id="custom-base-url"
                aria-label="自定义 API Base URL"
                type="url"
                value={customBaseUrl}
                onChange={(event) => setCustomBaseUrl(event.target.value)}
                placeholder="https://api.example.com/v1"
                autoComplete="url"
                disabled={loading || saving}
                className="bg-morandi-bg border-morandi-card-alt"
              />
            )}
            <p className="text-[11px] text-morandi-text-muted">
              可直接使用 Google AI Studio，也可以选择自定义并输入其他兼容接口地址。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text-model" className="text-xs text-morandi-text-secondary">
              文本模型
            </Label>
            <Select
              value={textModel}
              onValueChange={(value) =>
                setTextModel(value as (typeof MODEL_OPTIONS)[number])
              }
              disabled={loading || saving}
            >
              <SelectTrigger
                id="text-model"
                className="bg-morandi-bg border-morandi-card-alt"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-morandi-text-muted">
              JD 解析、简历解析和匹配评分都会使用这个模型。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-xs text-morandi-text-secondary">
              API Key
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-morandi-text-muted" />
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  status.configured
                    ? '已保存，留空保持当前 API Key'
                    : '输入 API Key'
                }
                autoComplete="new-password"
                disabled={loading || saving}
                className="pl-9 pr-10 bg-morandi-bg border-morandi-card-alt"
              />
              <button
                type="button"
                onClick={() => setShowKey((value) => !value)}
                aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-morandi-text-muted hover:text-morandi-text"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              disabled={saving || !status.configured}
              className="text-xs text-morandi-text-muted hover:text-morandi-error"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              清除本地配置
            </Button>
            <Button
              type="submit"
              disabled={loading || saving}
              className="bg-morandi-primary hover:bg-morandi-primary/90 text-white"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存并启用
            </Button>
          </div>
        </form>

        <div className="mt-5 rounded-md border border-morandi-card-alt px-4 py-3">
          <p className="text-xs font-medium text-morandi-text-secondary mb-1">
            配置保存说明
          </p>
          <p className="text-[11px] leading-relaxed text-morandi-text-muted">
            API Key 会写入已被 Git 忽略的本地后端 `.env` 文件，不会返回给浏览器。
            请仅在本机或受信任环境中使用，不要把这个无登录保护的配置页面直接部署到公网。
          </p>
        </div>
      </main>
    </div>
  );
}
