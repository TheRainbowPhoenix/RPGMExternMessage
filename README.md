# Translate MV / MZ

Need deno. Get deno. [DENO NOW](https://deno.com).

Will grap all text into a comfy `ExternMessage.csv`. Translate it how you want, it is yours my friend.
Plugin `ExternMessage.js` will read it and try to translate live text from it. It's better than editing game data.


To do MTL, you need LocalLM / OpenAI endpoint accessible.


## Usage

Put the `parser` folder from the zip of this repo at the game root 

drop the `ExternMessage.js` plugin into `js/plugins/` folder
add this plugin conf to the `js/plugins.js` list : `{"name":"ExternMessage","status":true,"description":"Include message from external file.","parameters":{"Line Max":"4","Csv File Path":"ExternMessage.csv","Csv File Encode":"utf-8","Use Name Tag":"true","Default Reference Column Index":"2","Fail Safe":"true"}}` (don't forget commas !)

Go into `data` folder (where is the Map*.json files) 

Run the following :

```sh
deno run -A ..\parser\text-extractor.ts
```

Now you have your `ExternMessage.csv` ready to get translated

## Auto Translate

Next you can translate `ExternMessage.csv` with your fav tool, or use mine : 

```sh
deno run -A ..\parser\translate.ts ExternMessage.csv ExternMessage_Auto.csv

deno run -A ..\parser\clean.ts

mv ExternMessage_AutoClean.csv ExternMessage.csv
```

