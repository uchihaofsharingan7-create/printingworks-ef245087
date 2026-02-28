import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { User, LogOut, Pencil, Check, X } from 'lucide-react';

export function ProfileMenu() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSave = () => {
    if (name.trim()) {
      updateProfile(name.trim());
      setEditing(false);
    }
  };

  const roleLabel = user.role === 'technician' ? 'IT Technician' : 'Student';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 hover:border-primary/40 transition-colors">
          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-xs font-medium text-foreground">{user.name}</span>
          <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">{roleLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3 space-y-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          {editing && user.role === 'technician' ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-7 text-xs bg-secondary"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <button onClick={handleSave} className="text-primary hover:text-primary/80"><Check className="h-3.5 w-3.5" /></button>
              <button onClick={() => { setEditing(false); setName(user.name); }} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{user.name}</p>
              {user.role === 'technician' && (
                <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-primary transition-colors">
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground font-mono">{roleLabel}</p>
        </div>
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleLogout}>
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          Log Out
        </Button>
      </PopoverContent>
    </Popover>
  );
}
