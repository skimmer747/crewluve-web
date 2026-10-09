import { Icon } from './Icon'

export function DaysHomePill({ name, days }: { name: string; days: number }) {
  return (
    <div class="glass pill">
      <Icon name="House" size={15} color="var(--green)" />
      <span>{days === 1 ? `${name}'s been home for 1 day` : `${name}'s been home for ${days} days`}</span>
    </div>
  )
}
