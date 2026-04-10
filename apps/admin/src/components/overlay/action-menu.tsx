'use client'

import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@sao-blog/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@sao-blog/ui/components/dropdown-menu'

interface ActionMenuProps {
  label?: ReactNode
  triggerSrLabel?: string
  align?: 'start' | 'center' | 'end'
  widthClassName?: string
  renderItems: () => ReactNode
}

export function ActionMenu({
  label = '更多操作',
  triggerSrLabel = '開啟選單',
  align = 'end',
  widthClassName = 'w-[160px]',
  renderItems,
}: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="flex size-8 p-0 data-[state=open]:bg-muted"
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">{triggerSrLabel}</span>
          </Button>
        }
      />
      <DropdownMenuContent align={align} className={widthClassName}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {renderItems()}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
