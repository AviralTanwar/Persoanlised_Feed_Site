import { useEditor, EditorContent } from '@tiptap/react'
import { useEffect } from 'react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import Placeholder from '@tiptap/extension-placeholder'
import './RichEditor.css'

const PALETTE = [
  '#f38ba8', // red
  '#fab387', // peach
  '#f9e2af', // yellow
  '#a6e3a1', // green
  '#94e2d5', // teal
  '#89b4fa', // blue
  '#cba6f7', // purple
  '#cdd6f4', // lavender
]

function Btn({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      className={`re-btn${active ? ' on' : ''}`}
      title={title}
      onClick={onClick}
      onMouseDown={e => e.preventDefault()}
    >
      {children}
    </button>
  )
}

export default function RichEditor({ content = '', onChange, placeholder = 'Start writing…' }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    const isEmpty = !content || content === '<p></p>'
    if (isEmpty && editor.isEmpty) return
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content || '', false)
    }
  }, [content, editor])

  if (!editor) return null

  const h = lvl => editor.isActive('heading', { level: lvl })

  return (
    <div className="re-wrap">
      <div className="re-toolbar">
        <Btn active={h(1)} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</Btn>
        <Btn active={h(2)} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</Btn>
        <Btn active={h(3)} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</Btn>

        <span className="re-sep" />

        <Btn active={editor.isActive('bold')}      onClick={() => editor.chain().focus().toggleBold().run()}      title="Bold"><b>B</b></Btn>
        <Btn active={editor.isActive('italic')}    onClick={() => editor.chain().focus().toggleItalic().run()}    title="Italic"><i>I</i></Btn>
        <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><u>U</u></Btn>
        <Btn active={editor.isActive('strike')}    onClick={() => editor.chain().focus().toggleStrike().run()}    title="Strikethrough"><s>S</s></Btn>
        <Btn active={editor.isActive('code')}      onClick={() => editor.chain().focus().toggleCode().run()}      title="Inline code">{'<>'}</Btn>

        <span className="re-sep" />

        <Btn active={editor.isActive('bulletList')}  onClick={() => editor.chain().focus().toggleBulletList().run()}  title="Bullet list">• -</Btn>
        <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1.</Btn>
        <Btn active={editor.isActive('blockquote')}  onClick={() => editor.chain().focus().toggleBlockquote().run()}  title="Blockquote">❝</Btn>
        <Btn active={editor.isActive('codeBlock')}   onClick={() => editor.chain().focus().toggleCodeBlock().run()}   title="Code block">{ '{}'}</Btn>

        <span className="re-sep" />

        <Btn active={false} onClick={() => editor.chain().focus().undo().run()} title="Undo">↩</Btn>
        <Btn active={false} onClick={() => editor.chain().focus().redo().run()} title="Redo">↪</Btn>

        <span className="re-sep" />

        {PALETTE.map(c => (
          <button
            key={c}
            type="button"
            className={`re-swatch${editor.isActive('textStyle', { color: c }) ? ' on' : ''}`}
            style={{ '--sc': c }}
            title={c}
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor.chain().focus().setColor(c).run()}
          />
        ))}
        <Btn active={false} onClick={() => editor.chain().focus().unsetColor().run()} title="Reset colour">✕</Btn>
      </div>

      <EditorContent editor={editor} className="re-content" />
    </div>
  )
}
