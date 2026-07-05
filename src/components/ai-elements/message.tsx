import type { ComponentProps, HTMLAttributes } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: 'system' | 'user' | 'assistant';
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'group flex w-full flex-col gap-2',
      from === 'user' ? 'items-end' : 'items-start',
      className,
    )}
    data-role={from}
    {...props}
  />
);

export const MessageContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'max-w-[88%] text-sm leading-relaxed text-foreground group-data-[role=assistant]:max-w-full group-data-[role=assistant]:bg-transparent group-data-[role=user]:rounded-2xl group-data-[role=user]:bg-primary group-data-[role=user]:px-4 group-data-[role=user]:py-3 group-data-[role=user]:text-primary-foreground',
      className,
    )}
    {...props}
  />
);

export const MessageResponse = ({ className, children, ...props }: ComponentProps<'div'>) => (
  <div className={cn('prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-pre:my-2 prose-code:text-current', className)} {...props}>
    <ReactMarkdown>{String(children ?? '')}</ReactMarkdown>
  </div>
);