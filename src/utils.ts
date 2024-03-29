import { BlockEntity } from '@logseq/libs/dist/LSPlugin'
import { LSPluginUserEvents } from "@logseq/libs/dist/LSPlugin.user";
import React from "react";

import { RichText } from './types';

let _visible = logseq.isMainUIVisible;

function subscribeLogseqEvent<T extends LSPluginUserEvents>(
  eventName: T,
  handler: (...args: any) => void
) {
  logseq.on(eventName, handler);
  return () => {
    logseq.off(eventName, handler);
  };
}

const subscribeToUIVisible = (onChange: () => void) =>
  subscribeLogseqEvent("ui:visible:changed", ({ visible }) => {
    _visible = visible;
    onChange();
  });

export const useAppVisible = () => {
  return React.useSyncExternalStore(subscribeToUIVisible, () => _visible);
};

export const parseBlock = (block: BlockEntity) => {
  console.log('block', block)

  // task
  if (block?.marker) {
    const regex = /^(TODO|DOING|NOW|LATER) /g
    const content = block.content.replace(regex, '')
    const taskObject = {
      type: 'to_do',
      to_do: {
        rich_text: parseContent(content),
        checked: false,
      }
    }
    if (
      block?.marker === 'TODO' ||
      block?.marker === 'DOING' ||
      block?.marker === 'LATER' ||
      block?.marker === 'NOW'
    ) {
      return taskObject
    }
    if (block?.marker === 'DONE') {
      taskObject.to_do.checked = true
      return taskObject
    }
    return taskObject
  }

  // code block
  const codeBlockRegexp = /^```(\w+)\n([\s\S]+)```$/
  const codeBlockMatch = block?.content?.match(codeBlockRegexp)
  if (codeBlockMatch) {
    const language = codeBlockMatch[1]
    const content = codeBlockMatch[2].trim()
    const languageMap = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      rb: 'ruby',
    };

    // @ts-ignore
    const fullForm = languageMap[language.toLowerCase()] || language

    return ({
      code: {
        rich_text: [{
          text: { content }
        }],
        language: fullForm,
      }
    })
  }

  // blockquote
  if (/^> (.*)$/.test(block?.content)) {
    return ({
      quote: {
        rich_text: parseContent(block?.content?.substring(2)),
      }
    })
  }

  // title1
  if (/^# (.*)$/.test(block.content)) {
    return ({
      heading_1: {
        rich_text: parseContent(block?.content?.substring(2))
      }
    })
  }

  // title2
  if (/^## (.*)$/.test(block.content)) {
    return ({
      heading_2: {
        rich_text: parseContent(block?.content?.substring(3))
      }
    })
  }

  // title3
  if (/^### (.*)$/.test(block.content)) {
    return ({
      heading_3: {
        rich_text: parseContent(block?.content?.substring(4))
      }
    })
  }

  // table
  if (/^\s*\|.*\|\s*\n\s*\|.*\|.*\|\s*\n((?:\|.*\|\s*\n)*)/.test(block?.content)) {
    const isDivider = /.*\|.*---.*\|.*/.test(block.content)
    const lines = block.content.trim().split('\n').filter((i, index) => isDivider ? index !== 1 : true)
    const rows = lines.map(line => line.split('|').map(cell => cell.trim()).filter(i => !!i));
    const children = rows.map(row => ({
      table_row: {
        cells: row.map(content => [{
          text: {
            content
          }
        }])
      }
    }))

    return ({
      table: {
        table_width: 3,
        has_column_header: isDivider,
        has_row_header: false,
        children,
      }
    })
  }

  // toggle
  // if (block?.children && block.children.length !== 0) {
  //   const toggleBlock: any = {
  //     toggle: {
  //       rich_text: parseContent(block?.content)
  //     },
  //   }
  //   if (block?.children && block.children.length !== 0) {
  //     toggleBlock.toggle.children = block?.children.map(i => parseBlock(i as BlockEntity))
  //   }
  //   return toggleBlock
  // }

  // TODO
  return ({
    paragraph: {
      rich_text: parseContent(block?.content)
    }
  })
}

const parseContent = (content: string): RichText[] => {
  if (/.*?\[.*?\]\(.*?\).*?/.test(content)) {
    const convertText = (text: string) => {
      const regex = /\[(.*?)\]\((.*?)\)/g
      const matches = [...text.matchAll(regex)]
      const result = []
      let lastIndex = 0
      matches.forEach(match => {
        const [, beforeText, url] = match

        if (beforeText) {
          result.push({
            text: {
              content: text.substring(lastIndex, match.index),
            },
          })
        }

        result.push({
          text: {
            content: beforeText,
            ...(url ? { link: { url } } : {}),
          },
        })

        lastIndex = (match?.index || 0) + match[0].length;
      })

      if (lastIndex < text.length) {
        result.push({
          text: {
            content: text.substring(lastIndex),
          },
        })
      }

      return result
    }

    return convertText(content)
  }

  return ([{
    text: {
      content,
    }
  }])
}

// 计算 block 的深度
export const calculateDepth = (node: any): number => {
  if (!node.toggle || !node.toggle.children || node.toggle.children.length === 0) {
    return 0;
  } else {
    return 1 + Math.max(...node.toggle.children.map(calculateDepth));
  }
}

export const parseTree: any = (tree: BlockEntity[]) => {
  let array: any = []
  tree.map(block => {
    if (block.children && block.children.length > 0) {
      array.push(parseBlock(block))
      array = array.concat(parseTree(block.children))
    } else {
      array.push(parseBlock(block))
    }
  })
  return array
}
