// Codex functions.exec orchestration only. This is not a Node/API image runner.
// Read this file through exec_command, then await eval(the returned source).
(async () => {
  async function runCommand(cmd,max_output_tokens) {
    let state=await tools.exec_command({cmd,max_output_tokens}), output=state.output||'';
    while (state.session_id && state.exit_code==null) {
      state=await tools.write_stdin({session_id:state.session_id,chars:'',yield_time_ms:1000,max_output_tokens});
      output+=state.output||'';
    }
    return {...state,output};
  }
  const planResult = await runCommand('python specs/gita-art-20261016/plan_batch.py --limit 32',6000);
  if (planResult.exit_code !== 0) throw Error(planResult.output);
  const plan = JSON.parse(planResult.output);
  let cursor=0, completed=0, failed=0, consecutiveErrors=0, stopped=false;
  async function worker() {
    while (!stopped && cursor < plan.jobs.length) {
      const planned=plan.jobs[cursor++];
      try {
        const read=await runCommand('python specs/gita-art-20261016/read_jobs.py --start '+planned.index+' --count 1',9000);
        if (read.exit_code !== 0) throw Error(read.output);
        const job=JSON.parse(read.output)[0];
        if (!job) continue;
        let result;
        for (let attempt=0;attempt<2;attempt++) {
          try { result=await tools.image_gen__imagegen({prompt:job.prompt,transparent_background:false}); break; }
          catch(error) {
            if (attempt===1 || /quota|usage.limit|billing|insufficient|rate.limit/i.test(String(error))) throw error;
            await new Promise(resolve=>setTimeout(resolve,20000));
          }
        }
        const source=result.output_hint?.match(/as (C:\\[^\r\n]+?\.png)/)?.[1];
        if (!source) throw Error('Generated image path unavailable');
        let saved;
        for (let attempt=0;attempt<2;attempt++) {
          saved=await runCommand("python specs/gita-art-20261016/record.py --key "+job.key+" --source '"+source.replace(/'/g,"''")+"'",400);
          if (saved.exit_code===0) break;
        }
        if (saved.exit_code!==0) throw Error('Saving master failed: '+saved.output);
        completed++; consecutiveErrors=0;
        if ((plan.existing+completed)%10===0) notify('Gita masters saved: '+(plan.existing+completed)+'/700; latest '+job.source_ref+'.');
      } catch(error) {
        failed++; consecutiveErrors++;
        const message=String(error).slice(0,500);
        await tools.apply_patch('*** Begin Patch\n*** Add File: specs/gita-art-20261016/errors/'+planned.key+'.json\n+'+JSON.stringify({key:planned.key,error:message})+'\n*** End Patch');
        notify({verse:planned.source_ref,error:message});
        if (consecutiveErrors>=5 || /quota|usage.limit|billing|insufficient|rate.limit/i.test(message)) stopped=true;
      }
    }
  }
  await Promise.all(Array.from({length:4},()=>worker()));
  text({batch_saved:completed,generated:plan.existing+completed,failed,stopped});
  text(await runCommand('python specs/gita-art-20261016/process.py --status',1200));
})()
