import { cn } from '@/lib/utils'
import Grainient from './grainient'
import Iridescence from './iridescence'

export const Badge = ({
  variant = 'base',
  className,
  backgroundClassName,
  content,
  label,
}: {
  variant?: 'base' | 'rare' | 'epic' | 'legendary'
  className?: string
  backgroundClassName?: string
  content: React.ReactNode
  label: string
}) => {
  return (
    <div
      className={cn(
        'badge-clip-path @container relative flex w-full max-w-60 pb-[calc(100%*(256/240))] flex-col items-center justify-center overflow-hidden bg-black/80',
        className,
      )}
    >
      <div className="absolute inset-0.5">
        <div className="badge-clip-path relative size-full p-[4cqw]">
          <div className="pointer-events-none absolute -inset-1/2 bg-neutral-300">
            {variant !== 'base' && (
              <Grainient color1="#a3a3a3" color2="#3f3f46" color3="#525252" />
            )}
          </div>
          <div className="badge-clip-path relative size-full p-0.5 bg-black/80">
            <div className="badge-clip-path relative size-full">
              <div
                className={cn(
                  'pointer-events-none absolute size-full',
                  backgroundClassName,
                )}
              >
                {variant === 'legendary' && (
                  <Iridescence color={[0.9, 0.9, 0.9]} />
                )}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-shadow-lg px-2">
                <p className="text-[30cqw] leading-none font-bold">{content}</p>
                <p className="max-w-28 text-center text-[14cqw] leading-[14cqw] font-semibold mt-[5cqw]">
                  {label}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
