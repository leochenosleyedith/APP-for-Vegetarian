// Model inference stays in a dedicated browser worker. No image upload endpoint exists.
let classifier;
const MODEL_REVISION='6b7c523703ae26e39be4b03774966f8571c7f523';
self.onmessage=async({data:{image,foods}})=>{
  try {
    const {pipeline,env,RawImage}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/dist/transformers.web.js');
    env.allowLocalModels=false;
    env.backends.onnx.wasm.numThreads=1;
    env.backends.onnx.wasm.proxy=false;
    if(!classifier)classifier=await pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',{
      revision:MODEL_REVISION,dtype:'q8',device:'wasm',
      progress_callback:p=>{if(p.status==='progress')self.postMessage({type:'progress',text:`Downloading recognition model${Number.isFinite(p.progress)?' · '+Math.round(p.progress)+'% of current file':''}…`});else if(p.status==='ready')self.postMessage({type:'progress',text:'Looking for possible foods…'});}
    });
    const labels=foods.map(f=>'a photo of '+f.name.toLowerCase());
    const negatives=['a photo of a person','a photo of an empty plate','a photo of a pet','a photo of a landscape','a photo of a document','a photo of an object that is not food'];
    const results=await classifier(new RawImage(new Uint8Array(image.data),image.width,image.height,3),[...labels,...negatives],{hypothesis_template:'{}'});
    const nonFood=negatives.includes(results[0].label);
    const selected=results.filter(r=>labels.includes(r.label)).slice(0,6).map(r=>({foodId:foods[labels.indexOf(r.label)].id}));
    self.postMessage({type:'result',nonFood,results:selected});
  }catch(e){self.postMessage({type:'error'});}
};
