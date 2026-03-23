'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

type RoleItem = {
  label: string
  href: string
}

export default function RoleSwitcher({
  roles,
}: {
  roles: RoleItem[]
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentRole =
    roles.find((role) => pathname === role.href || pathname.startsWith(role.href + '/'))?.label ||
    'Switch Role'

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
      >
        <span className="hidden sm:inline">{currentRole}</span>
        <span className="sm:hidden">Role</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg z-[999] overflow-hidden">
          {roles.map((role) => {
            const active =
              pathname === role.href || pathname.startsWith(role.href + '/')

            return (
              <button
                key={role.href}
                type="button"
                onClick={() => {
                  setOpen(false)
                  router.push(role.href)
                }}
                className={`w-full text-left px-4 py-3 text-sm transition ${active
                    ? 'bg-gray-50 font-semibold text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {role.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}