# Translate MV / MZ

Need LocalLM / OpenAI endpoint accessible.
Usage:

```sh
game\data>deno run -A ..\parser\text-extractor.ts

game\data>deno run -A ..\parser\translate.ts ExternMessage.csv ExternMessage_Auto.csv

game\data>deno run -A ..\parser\clean.ts

mv ExternMessage_AutoClean.csv ExternMessage.csv
```

Plugin conf : `{"name":"ExternMessage","status":true,"description":"Include message from external file.","parameters":{"Line Max":"4","Csv File Path":"ExternMessage.csv","Csv File Encode":"utf-8","Use Name Tag":"true","Default Reference Column Index":"2","Fail Safe":"true"}}`