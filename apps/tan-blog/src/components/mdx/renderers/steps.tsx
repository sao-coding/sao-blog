import React from 'react'
import { cn } from '@/lib/utils'
import { flattenItems } from './children'

export interface MdxStepProps {
  /** 步驟標題 */
  title: React.ReactNode
  children?: React.ReactNode
}

/** 單一步驟。需放在 <Steps> 內，實際 render 由父層處理（資料元件）。 */
export const MdxStep = ({ children }: MdxStepProps) => <>{children}</>
MdxStep.displayName = 'MdxStep'

type StepElement = React.ReactElement<MdxStepProps>

// 以 title prop 辨識 Step（同 Tabs：不靠 child.type，序列化後 reference 可能失效）
const isStep = (child: React.ReactNode): child is StepElement =>
  React.isValidElement(child) &&
  typeof (child.props as MdxStepProps).title !== 'undefined'

/**
 * 步驟清單（教學文的「第 1 步、第 2 步」）：左側朱色圓圈編號，步驟之間一條髮絲線串起來。
 *
 * ```mdx
 * <Steps>
 *   <Step title="安裝 Docker">
 *   ```bash
 *   curl -fsSL https://get.docker.com | sh
 *   ```
 *   </Step>
 *   <Step title="啟動服務">執行 `docker compose up -d`。</Step>
 * </Steps>
 * ```
 */
export const MdxSteps = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  const steps = flattenItems(children).filter(isStep)
  if (steps.length === 0) return null

  return (
    <ol className={cn('mdx-block mdx-steps', className)}>
      {steps.map((step, index) => (
        <li key={index} className="mdx-step">
          <p className="mdx-step-title">{step.props.title}</p>
          {step.props.children && <div className="mdx-step-body">{step.props.children}</div>}
        </li>
      ))}
    </ol>
  )
}
