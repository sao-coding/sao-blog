'use client'

import React from 'react'
import { motion, useInView } from 'motion/react'

import {
  IconAndroidStudio,
  IconArduino,
  IconCodePen,
  IconCS,
  IconCSS,
  IconDjango,
  IconDocker,
  IconDotNet,
  IconFirebase,
  IconFlask,
  IconGit,
  IconGithub,
  IconHTML,
  IconJava,
  IconJavaScript,
  IconMarkdown,
  IconMySQL,
  IconNextJS,
  IconNodeJS,
  IconPHP,
  IconPlanetScale,
  IconPostman,
  IconPowershell,
  IconPrisma,
  IconPython,
  IconReactJS,
  IconTypeScript,
  IconVercel,
  IconVisualStudio,
  IconVite,
  IconVSCode,
} from '@/components/icons'
import { Marquee } from '@/components/magicui/marquee'

const languageSkills = [
  IconArduino,
  IconJava,
  IconCS,
  IconPython,
  IconHTML,
  IconCSS,
  IconJavaScript,
  IconMarkdown,
  IconPHP,
  IconMySQL,
  IconTypeScript,
]

const toolSkills = [
  IconAndroidStudio,
  IconCodePen,
  IconDocker,
  IconGit,
  IconGithub,
  IconPrisma,
  IconPlanetScale,
  IconPostman,
  IconPowershell,
  IconVercel,
  IconVisualStudio,
  IconFirebase,
  IconVSCode,
]

const frameworkSkills = [
  IconNextJS,
  IconReactJS,
  IconVite,
  IconNodeJS,
  IconDjango,
  IconFlask,
  IconDotNet,
]

const SkillRow = ({
  icons,
  reverse,
}: {
  icons: React.ComponentType<{ className?: string }>[]
  reverse?: boolean
}) => (
  <Marquee className="py-3 [--duration:32s]" reverse={reverse} pauseOnHover>
    {icons.map((Icon, i) => (
      <Icon
        key={i}
        className="mx-4 h-8 w-8 opacity-40 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
      />
    ))}
  </Marquee>
)

const SkillsCard = () => {
  const ref = React.useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.6 }}
    >
      <header className="mb-6">
        <p className="text-[11px] tracking-[0.3em] text-neutral-10/40 uppercase">
          Craft
        </p>
        <h2 className="mt-1 text-2xl font-light tracking-wide text-neutral-10/80">
          技藝
        </h2>
      </header>

      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <SkillRow icons={languageSkills} />
        <SkillRow icons={toolSkills} reverse />
        <SkillRow icons={frameworkSkills} />
      </div>

      <p className="mt-6 text-sm leading-relaxed text-neutral-10/50">
        語言、工具與框架——一路上用過、也還在學的那些。
      </p>
    </motion.div>
  )
}

export default SkillsCard
