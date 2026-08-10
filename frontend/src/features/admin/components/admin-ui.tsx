import { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-800',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200/70 dark:bg-brand-900/25 dark:text-brand-300 dark:ring-brand-800/60',
  success: 'bg-green-50 text-green-700 ring-green-200/70 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-900/70',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/70',
  danger: 'bg-red-50 text-red-700 ring-red-200/70 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/70',
};

export function AdminCard({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[2rem] border border-neutral-200/80 bg-white/90 shadow-sm shadow-black/[0.03] ring-1 ring-white/70 backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-900/75 dark:ring-white/[0.03]',
        interactive && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.04]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('grid gap-6', className)}>{children}</section>;
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
            {eyebrow}
          </p>
        )}
        <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-neutral-950 dark:text-neutral-50 sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/35', className)}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-neutral-950 dark:text-neutral-100">{value}</p>
    </div>
  );
}

export function AdminBadge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1', toneClasses[tone], className)}>
      {children}
    </span>
  );
}

export function AdminStatusBadge({ status, tone = 'neutral' }: { status: ReactNode; tone?: Tone }) {
  return <AdminBadge tone={tone}>{status}</AdminBadge>;
}

export function AdminButton({
  children,
  className,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-neutral-950',
        variant === 'primary' && 'bg-brand-500 text-white shadow-sm shadow-brand-500/20 hover:bg-brand-600 hover:shadow-md hover:shadow-brand-500/25',
        variant === 'secondary' && 'border border-neutral-200/80 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-neutral-800/80 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800',
        variant === 'ghost' && 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100',
        variant === 'danger' && 'bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AdminIconButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-neutral-900 dark:hover:text-neutral-100',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AdminActionButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <AdminButton variant="secondary" {...props} />;
}

export function AdminInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-neutral-200/80 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-neutral-800/80 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-600',
        className,
      )}
      {...props}
    />
  );
}

export function AdminLabel({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('text-sm font-medium text-neutral-700 dark:text-neutral-300', className)} {...props}>
      {children}
    </label>
  );
}

export function AdminAvatar({ label, imageUrl, className }: { label: string; imageUrl?: string | null; className?: string }) {
  const fallback = label.trim().charAt(0).toUpperCase() || 'A';

  return (
    <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-900 text-xs font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900', className)}>
      {imageUrl ? <img src={imageUrl} alt={label} className="h-full w-full object-cover" /> : fallback}
    </span>
  );
}

export function AdminEmptyState({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <AdminCard className={cn('p-8 text-center', className)}>
      <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </AdminCard>
  );
}

export function AdminSkeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-neutral-200/70 dark:bg-neutral-800/70', className)} />;
}

export function AdminTable({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-hidden rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-800/80 dark:bg-neutral-900', className)}>{children}</div>;
}

export function AdminTableHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('border-b border-neutral-200/80 bg-neutral-50/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:border-neutral-800/80 dark:bg-neutral-950/35', className)}>{children}</div>;
}

export function AdminTableRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('border-b border-neutral-200/70 px-4 py-3 transition-colors last:border-b-0 hover:bg-neutral-50/70 dark:border-neutral-800/70 dark:hover:bg-neutral-950/30', className)}>{children}</div>;
}

export function AdminTableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-w-0 text-sm text-neutral-700 dark:text-neutral-300', className)}>{children}</div>;
}

export function AdminPagination({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-between gap-3 border-t border-neutral-200/80 px-4 py-3 dark:border-neutral-800/80', className)}>{children}</div>;
}

export function AdminPaginationControls({
  total,
  limit,
  offset,
  prevLabel = 'Previous',
  nextLabel = 'Next',
  onPage,
}: {
  total: number;
  limit: number;
  offset: number;
  prevLabel?: ReactNode;
  nextLabel?: ReactNode;
  onPage: (offset: number) => void;
}) {
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

  return (
    <AdminPagination>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">
        {from}–{to} / {total}
      </span>
      <div className="flex items-center gap-1">
        <AdminButton variant="secondary" disabled={page <= 1} onClick={() => onPage(offset - limit)}>
          {prevLabel}
        </AdminButton>
        <AdminButton variant="secondary" disabled={page >= pages} onClick={() => onPage(offset + limit)}>
          {nextLabel}
        </AdminButton>
      </div>
    </AdminPagination>
  );
}

export function AdminFilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-3 rounded-2xl border border-neutral-200/80 bg-white/80 p-3 dark:border-neutral-800/80 dark:bg-neutral-900/70 sm:flex-row sm:items-center sm:justify-between', className)}>{children}</div>;
}

export function AdminToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>;
}

export function AdminDivider({ className }: { className?: string }) {
  return <div className={cn('h-px bg-neutral-200/80 dark:bg-neutral-800/80', className)} />;
}

export function AdminDropdown({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-neutral-200/80 bg-white p-1 shadow-xl shadow-black/10 dark:border-neutral-800/80 dark:bg-neutral-900', className)}>{children}</div>;
}

export function AdminSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full appearance-none rounded-xl border border-neutral-200/80 bg-white px-3 py-2.5 pr-8 text-sm text-neutral-950 outline-none transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-neutral-800/80 dark:bg-neutral-900 dark:text-neutral-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

type AdminModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function AdminModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: AdminModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-neutral-950/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[70] flex max-h-[calc(100vh-2rem)] w-full -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[1.75rem] border border-neutral-200/80 bg-white p-6 shadow-2xl shadow-black/15 outline-none data-[state=open]:animate-slide-up dark:border-neutral-800/80 dark:bg-neutral-900',
            modalSizes[size],
            className,
          )}
        >
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute end-4 top-4 rounded-xl p-2 text-neutral-500 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-800 focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </Dialog.Close>
          {title && (
            <Dialog.Title className="pe-10 text-lg font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
              {title}
            </Dialog.Title>
          )}
          {description && (
            <Dialog.Description className="mt-1.5 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              {description}
            </Dialog.Description>
          )}
          {children && <div className="mt-5 min-h-0 flex-1 overflow-y-auto">{children}</div>}
          {footer && (
            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-neutral-200/80 pt-5 dark:border-neutral-800/80">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type AdminConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
};

export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  loading = false,
  onConfirm,
}: AdminConfirmDialogProps) {
  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <AdminButton variant="secondary" onClick={() => onOpenChange(false)}>
            {cancelLabel ?? 'Cancel'}
          </AdminButton>
          <AdminButton
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '...' : confirmLabel ?? 'Confirm'}
          </AdminButton>
        </>
      }
    />
  );
}

type AdminDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function AdminDrawer({ open, onOpenChange, title, description, children, footer, className }: AdminDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-neutral-950/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed inset-y-0 end-0 z-[70] flex h-full w-full max-w-md flex-col border-s border-neutral-200/80 bg-white shadow-2xl shadow-black/10 outline-none data-[state=open]:animate-slide-up dark:border-neutral-800/80 dark:bg-neutral-950 sm:max-w-lg',
            className,
          )}
        >
          {(title || description) && (
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200/80 px-6 py-4 dark:border-neutral-800/80">
              <div className="min-w-0">
                {title && (
                  <Dialog.Title className="text-lg font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
                    {title}
                  </Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="shrink-0 rounded-xl p-2 text-neutral-500 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-800 focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
          )}
          {children && <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>}
          {footer && (
            <div className="border-t border-neutral-200/80 px-6 py-4 dark:border-neutral-800/80">
              <div className="flex flex-wrap justify-end gap-2">{footer}</div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
