import "@logseq/libs";
import { Client } from '@notionhq/client'

import React from "react";
import * as ReactDOM from "react-dom/client";

import App from "./App";
import { logseq as PL } from "../package.json";

import "./index.css";

// TODO
const notionToken = ''
const logseqPageId = ''

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);

const pluginId = PL.id;

const notion = new Client({
  auth: notionToken,
})

function main() {
  console.info(`#${pluginId}: MAIN`);
  const root = ReactDOM.createRoot(document.getElementById("app")!);

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
    notion.pages.create({
      "cover": {
        "type": "external",
        "external": {
          "url": "https://upload.wikimedia.org/wikipedia/commons/6/62/Tuscankale.jpg"
        }
      },
      "icon": {
        "type": "emoji",
        "emoji": "🥬"
      },
      "parent": {
        "type": "page_id",
        "page_id": logseqPageId
      },
      "properties": {
        "title": {
          "title": [
            {
              "text": {
                "content": "Tuscan kale"
              }
            }
          ]
        },
      },
      "children": [
        {
          "object": "block",
          "heading_2": {
            "rich_text": [
              {
                "text": {
                  "content": "Lacinato kale"
                }
              }
            ]
          }
        },
        {
          "object": "block",
          "paragraph": {
            "rich_text": [
              {
                "text": {
                  "content": "Lacinato kale is a variety of kale with a long tradition in Italian cuisine, especially that of Tuscany. It is also known as Tuscan kale, Italian kale, dinosaur kale, kale, flat back kale, palm tree kale, or black Tuscan palm.",
                  "link": {
                    "url": "https://en.wikipedia.org/wiki/Lacinato_kale"
                  }
                },
              }
            ],
            "color": "default"
          }
        }
      ]
    }).then(response => {
      logseq.UI.showMsg('Page saved successfully 🎉', 'success')
    }).catch(error => {
      logseq.UI.showMsg(error, 'error')
    })
  })

  logseq.Editor.registerSlashCommand('sync block to notion', async () => {
    const currentBlock = await logseq.Editor.getCurrentBlock()

    if (!currentBlock?.content) {
      return
    }

    notion.blocks.children.append({
      block_id: logseqPageId,
      children: [
        {
          "paragraph": {
            "rich_text": [
              {
                "text": {
                  "content": currentBlock.content
                }
              }
            ]
          }
        }
      ],
    }).then(response => {
      logseq.UI.showMsg('Block saved successfully 🎉', 'success')
    }).catch(error => {
      console.error('error', error)
      logseq.UI.showMsg(error, 'error')
    })
  })
}

logseq.ready(main).catch(console.error);
