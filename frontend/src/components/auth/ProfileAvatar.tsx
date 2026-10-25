import { useState } from 'react'

interface ProfileAvatarProps {
  imageUrl: string | null
  name: string
  className?: string
}

export function ProfileAvatar({ imageUrl, name, className = 'size-9' }: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false)
  const initial = name.trim().charAt(0).toLocaleUpperCase() || '나'

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={`${className} rounded-full object-cover ring-1 ring-black/5`}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${className} grid place-items-center rounded-full bg-toss-ice-blue font-extrabold text-toss-blue ring-1 ring-toss-blue/10`}
    >
      {initial}
    </span>
  )
}
