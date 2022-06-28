# test-e2e


## Debug config

```json
{
        "name": "Debug e2e",
        "type": "pwa-node",
        "request": "launch",
        "runtimeArgs": [
          "playwright", 
          "test", 
          "-c", 
          "${workspaceRoot}/packages/test-e2e/src/config/config.ts", 
          "${relativeFile}", 
          "--headed"
        ],
        "runtimeExecutable": "npx",
        "env": {
          "TEST_TIMEOUT": "60000",
          "OPEN_DEVTOOLS": "true"
        },
        "skipFiles": [
          "<node_internals>/**"
        ]
      }
```