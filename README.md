# ShopDev Alliance
shopdev-alliance.myshopify.com 

## Preview URL
https://shopdev-alliance.myshopify.com/?preview_theme_id=[THEME_ID]

## Requirements  
It is recommended for this project to use Shopify CLI 

[Shopify CLI Reference](https://shopify.dev/themes/tools/cli)  
 - [Commands](https://shopify.dev/docs/themes/tools/cli/commands)  
 - [Upgrade](https://shopify.dev/docs/themes/tools/cli/commands#upgrade)
 - [Environments](https://shopify.dev/docs/themes/tools/cli/environments)
 
## Get Started
Using the Shopify CLI, can run locally using: 
 
`shopify theme dev -s shopdev-alliance`
 
_The `-s` is shorthand for `--store`. It should be noted that `.myshopify.com` is not necessary to pass for the store-name._
 
If working out of the the customizer and need to save updated sections use:
 
`shopify theme dev -s shopdev-alliance --theme-editor-sync `
