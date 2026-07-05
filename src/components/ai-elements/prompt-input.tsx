import { CornerDownLeftIcon, SquareIcon } from 'lucide-react';
import type { ComponentProps, FormEvent } from 'react';
import { cn } from '@/lib/utils';

export type PromptInputMessage = { text: string };

export type PromptInputProps = Omit<ComponentProps<'form'>, 'onSubmit'> & {
  onSubmit: (message: PromptInputMessage) => void;
};

export const PromptInput = ({ className, onSubmit, children, ...props }: PromptInputProps) => {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get('message') ?? '');
    onSubmit({ text });
  };

  return (
    <form className={cn('rounded-2xl border border-border bg-background/90 p-2 shadow-sm backdrop-blur', className)} onSubmit={submit} {...props}>
      {children}
    </form>
  );
};

export const PromptInputTextarea = ({ className, ...props }: ComponentProps<'textarea'>) => (
  <textarea
    name="message"
    rows={2}
    className={cn('min-h-[56px] w-full resize-none bg-transparent px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground', className)}
    {...props}
  />
);

export const PromptInputFooter = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={cn('flex items-center justify-end gap-2 px-1 pt-1', className)} {...props} />
);

export const PromptInputSubmit = ({ className, status = 'ready', disabled, ...props }: ComponentProps<'button'> & { status?: string }) => (
  <button
    type="submit"
    disabled={disabled}
    className={cn('grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40', className)}
    aria-label={status === 'streaming' || status === 'submitted' ? 'Parar' : 'Enviar'}
    {...props}
  >
    {status === 'streaming' || status === 'submitted' ? <SquareIcon className="h-4 w-4" /> : <CornerDownLeftIcon className="h-4 w-4" />}
  </button>
);