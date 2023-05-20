enum Type {
  Text = 'text',
  Mention = 'mention',
  Equation = 'equation',
}

export interface RichText {
  type?: Type
  [Type.Text]: {
    content: string
    link?: string | null
  }
}
