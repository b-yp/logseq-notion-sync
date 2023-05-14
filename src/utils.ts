import { BlockEntity } from '@logseq/libs/dist/LSPlugin'
import { LSPluginUserEvents } from "@logseq/libs/dist/LSPlugin.user";
import React from "react";

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
  // task
  if (block?.marker) {
    const regex = /^(TODO|DOING|NOW|LATER) /g
    const content = block.content.replace(regex, '')
    const taskObject = {
      type: 'to_do',
      to_do: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: content,
            }
          }
        ],
        checked: false,
      }
    }
    if (block?.marker === 'TODO' || block?.marker === 'NOW') {
      return taskObject
    }
    if (block?.marker === 'DONE') {
      taskObject.to_do.checked = true
      return taskObject
    }
    return taskObject
  }

  // TODO
  return ({
    paragraph: {
      rich_text: [
        {
          text: {
            content: block.content
          }
        }
      ]
    }
  })
}
