import "@logseq/libs";
import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin'
import { Client } from '@notionhq/client'

import React from "react";
import * as ReactDOM from "react-dom/client";

import App from "./App";
import { parseBlock, calculateDepth } from "./utils";
import { logseq as PL } from "../package.json";

import "./index.css";

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);

const pluginId = PL.id;

const settingsSchema: SettingSchemaDesc[] = [
  {
    title: 'Notion API Key',
    key: 'notionApiKey',
    type: 'string',
    description: 'Your OpenAI API key. You can get one at https://www.notion.so/my-integrations',
    default: '',
  },
  {
    title: 'Page ID',
    key: 'pageId',
    type: 'string',
    description: 'You can get one at https://developers.notion.com/docs/working-with-page-content#creating-a-page-with-content',
    default: '',
  }
]

logseq.useSettingsSchema(settingsSchema)

function main() {
  console.info(`#${pluginId}: MAIN`);

  const root = ReactDOM.createRoot(document.getElementById("app")!);
  const notion = new Client({
    auth: logseq.settings?.notionApiKey
  })

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  function createModel() {
    return {
      show() {
        logseq.showMainUI();
      },
    };
  }

  logseq.provideModel(createModel());
  logseq.setMainUIInlineStyle({
    zIndex: 11,
  });

  const openIconName = "template-plugin-open";

  logseq.provideStyle(css`
    .${openIconName} {
      opacity: 0.55;
      font-size: 20px;
      margin-top: 4px;
    }

    .${openIconName}:hover {
      opacity: 0.9;
    }
  `);

  logseq.App.registerUIItem("toolbar", {
    key: openIconName,
    template: `
      <div data-on-click="show" class="${openIconName}">⚙️</div>
    `,
  });

  logseq.Editor.registerSlashCommand('sync page to notion', async () => {
    if (!logseq.settings?.notionApiKey) {
      logseq.UI.showMsg('Notion API Key is not set', 'error')
      return
    }
    if (!logseq.settings?.pageId) {
      logseq.UI.showMsg('Page ID is not set', 'error')
      return
    }

    const block = await logseq.Editor.getCurrentBlock()
    if (!block) {
      logseq.UI.showMsg('No block selected', 'error')
      return
    }
    const page = await logseq.Editor.getPage(block?.page?.id)
    if (!page) {
      logseq.UI.showMsg('Page not found', 'error')
      return
    }
    // TODO: 为什么这里传入 pageName 能返回结果而 pageId 不行？看了 github 上好多也都是 paegName
    const pageBlocksTree = await logseq.Editor.getPageBlocksTree(page?.name)

    if (!pageBlocksTree.length) {
      logseq.UI.showMsg('Page not found', 'error')
      return
    }

    const contents = pageBlocksTree.map(i => parseBlock(i))

    // 判断一下 block 的深度，因为超过 3 请求接口会报错
    if (contents.map(i => calculateDepth(i))?.filter(i => i > 2)?.length > 0) {
      logseq.UI.showMsg('The block level cannot exceed 3', 'warning')
      return
    }

    const pageInfo: any = {
      "parent": {
        "type": "page_id",
        "page_id": logseq.settings?.pageId
      },
      // "cover": {
      //   "type": "external",
      //   "external": {
      //     "url": "https://upload.wikimedia.org/wikipedia/commons/6/62/Tuscankale.jpg"
      //   }
      // },
      // "icon": {
      //   "type": "emoji",
      //   "emoji": "🥬"
      // },
      "properties": {
        "title": {
          "title": [
            {
              "text": {
                "content": page?.name
              }
            }
          ]
        },
      },
      "children": contents,
    }

    if (page?.properties?.icon) {
      pageInfo.icon = {
        type: 'emoji',
        emoji: page.properties.icon
      }
    }

    notion.pages.create(
      pageInfo,
    ).then(response => {
      logseq.UI.showMsg('Page saved successfully 🎉', 'success')
    }).catch(error => {
      logseq.UI.showMsg(JSON.stringify( Object.keys(error).length !== 0 ? (error.message || error) : '请求失败' ), 'error')
    })
  })

  logseq.Editor.registerSlashCommand('sync block to notion', async () => {
    if (!logseq.settings?.notionApiKey) {
      logseq.UI.showMsg('Notion API Key is not set', 'error')
      return
    }
    if (!logseq.settings?.pageId) {
      logseq.UI.showMsg('Page ID is not set', 'error')
      return
    }

    const currentBlock = await logseq.Editor.getCurrentBlock()

    if (!currentBlock) {
      logseq.UI.showMsg('No block selected', 'error')
      return
    }

    notion.blocks.children.append({
      block_id: logseq.settings?.pageId,
      children: [parseBlock(currentBlock)] as any,
    }).then(response => {
      logseq.UI.showMsg('Block saved successfully 🎉', 'success')
    }).catch(error => {
      console.error('error', error)
      logseq.UI.showMsg(JSON.stringify( Object.keys(error).length !== 0 ? (error.message || error) : '请求失败' ), 'error')
    })
  })
}

logseq.ready(main).catch(console.error);
