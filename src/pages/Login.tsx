import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Layers, GraduationCap, Wrench, ArrowLeft, Lock } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'select' | 'technician'>('select');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleStudent = () => {
    login('student');
    navigate('/');
  };

  const handleTechnicianLogin = () => {
    if (password === 'Talha0712@') {
      login('technician');
      navigate('/');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto glow-primary">
            <Layers className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">PrintQueue</h1>
          <p className="text-sm text-muted-foreground">3D Printing Service</p>
        </div>

        {mode === 'select' ? (
          <div className="space-y-3">
            <button
              onClick={handleStudent}
              className="w-full flex items-center gap-4 rounded-lg border border-border bg-card p-5 hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Student</p>
                <p className="text-xs text-muted-foreground">Submit print jobs</p>
              </div>
            </button>

            <button
              onClick={() => setMode('technician')}
              className="w-full flex items-center gap-4 rounded-lg border border-border bg-card p-5 hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">IT Technician</p>
                <p className="text-xs text-muted-foreground">Manage print queue</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => { setMode('select'); setError(''); setPassword(''); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">IT Technician Login</p>
                  <p className="text-xs text-muted-foreground">Enter your password</p>
                </div>
              </div>

              <Input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Password"
                className="bg-secondary border-border"
                onKeyDown={(e) => e.key === 'Enter' && handleTechnicianLogin()}
              />

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button onClick={handleTechnicianLogin} className="w-full" disabled={!password}>
                Sign In
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
