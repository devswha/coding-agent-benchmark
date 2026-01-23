interface UserCommentProps {
  author: string
  content: string
  timestamp?: Date
  avatar?: string
}

export function UserComment({ author, content, timestamp, avatar }: UserCommentProps) {
  const formattedTime = timestamp
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(timestamp)
    : null

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-start gap-3">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {author.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white truncate">
              {author}
            </span>
            {formattedTime && (
              <span className="text-xs text-slate-400">
                {formattedTime}
              </span>
            )}
          </div>

          <p className="text-slate-300 whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>
      </div>
    </div>
  )
}
