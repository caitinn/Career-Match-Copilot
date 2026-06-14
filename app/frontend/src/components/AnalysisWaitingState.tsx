import { FileUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface AnalysisWaitingStateProps {
  title: string;
  description: string;
}

export default function AnalysisWaitingState({
  title,
  description,
}: AnalysisWaitingStateProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[360px] rounded-lg border border-dashed border-morandi-card-alt bg-morandi-card flex flex-col items-center justify-center text-center px-6">
      <div className="w-10 h-10 rounded-full bg-morandi-primary/10 flex items-center justify-center mb-3">
        <FileUp className="w-4.5 h-4.5 text-morandi-primary" />
      </div>
      <p className="text-sm font-medium text-morandi-text">{title}</p>
      <p className="text-xs text-morandi-text-muted mt-1 mb-4 max-w-sm">
        {description}
      </p>
      <Button
        size="sm"
        onClick={() => navigate('/')}
        className="bg-morandi-primary text-white hover:bg-morandi-primary/90"
      >
        前往上传
      </Button>
    </div>
  );
}
