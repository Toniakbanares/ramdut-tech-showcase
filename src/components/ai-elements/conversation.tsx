import { ArrowDownIcon } from 'lucide-react';
import { forwardRef, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export type ConversationProps = ComponentProps<'section'>;

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <section className={cn('relative flex-1 overflow-hidden', className)} role="log" {...props} />
);

export type ConversationContentProps = ComponentProps<'div'>;

export const ConversationContent = forwardRef<HTMLDivElement, ConversationContentProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex h-full flex-col gap-5 overflow-y-auto p-4 sm:p-5', className)} data-chat-scroll {...props} />
));
ConversationContent.displayName = 'ConversationContent';

export type ConversationEmptyStateProps = ComponentProps<'div'> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({ title, description, icon, className, children, ...props }: ConversationEmptyStateProps) => (
  <div className={cn('flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center', className)} {...props}>
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </>
    )}
  </div>
);

export const ConversationScrollButton = ({ className, ...props }: ComponentProps<'button'>) => (
  <button
    type="button"
    className={cn(
      'absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur',
      className,
    )}
    onClick={(event) => {
      props.onClick?.(event);
      document.querySelector('[role="log"] [data-chat-scroll]')?.scrollTo({ top: 999999, behavior: 'smooth' });
    }}
    aria-label="Ir para o fim"
    {...props}
  >
    <ArrowDownIcon className="h-4 w-4" />
  </button>
);