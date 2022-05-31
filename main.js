function addChange(editor, from, to, text) {
  let adjust = editor.listSelections().findIndex(({ anchor, head }) => {
    return CodeMirror.cmpPos(anchor, head) == 0 && CodeMirror.cmpPos(anchor, from) == 0;
  });
  editor.operation(() => {
    editor.replaceRange(text, from, to, 'yorkie');
    if (adjust > -1) {
      let range = editor.listSelections()[adjust];
      if (range && CodeMirror.cmpPos(range.head, CodeMirror.changeEnd({ from, to, text })) == 0) {
        let ranges = editor.listSelections().slice();
        ranges[adjust] = { anchor: from, head: from };
        editor.setSelections(ranges);
      }
    }
  });
}

async function main() {
  console.log('hi');
  const editor = CodeMirror.fromTextArea(document.getElementById('codemirror'), {
    lineNumbers: true,
  });

  const client = new yorkie.Client('http://localhost:8080');
  await client.activate();

  // !!문서와 다름 - Document -> DocumentReplica !!
  // const doc = new yorkie.Document('doc-1');
  const doc = new yorkie.DocumentReplica('docs-1');
  await client.attach(doc);

  doc.update((root) => {
    if (!root.content) {
      // doc이랑 다름 !! - new yorkie.Text(); x -> new yorkie.PlainText();
      root.content = new yorkie.PlainText();
    }
  });

  editor.on('beforeChange', (cm, change) => {
    console.log(change);
    if (change.origin === 'yorkie' || change.origin === 'setValue') {
      return;
    }
    const from = editor.indexFromPos(change.from);
    const to = editor.indexFromPos(change.to);
    const content = change.text.join('\n');
    doc.update((root) => {
      root.content.edit(from, to, content);
    });
  });

  doc.getRoot().content.onChanges((changes) => {
    console.log(changes);
    for (const change of changes) {
      if (change.type !== 'content' || change.actor === client.getID()) {
        continue;
      }
      const from = editor.posFromIndex(change.from);
      const to = editor.posFromIndex(change.to);
      addChange(editor, from, to, change.content || '');
      editor.replaceRange(change.content, from, to, 'yorkie');
    }
  });
  // 새로고침 시 값 전송
  // getValue x -> toString
  editor.setValue(doc.getRoot().content.toString());
}

main();
