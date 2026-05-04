import * as deepl from 'deepl-node';

let translator = null;

function getTranslator() {
  if (!translator) {
    const key = process.env.DEEPL_API_KEY;
    if (!key) throw new Error('DEEPL_API_KEY is not set');
    translator = new deepl.Translator(key);
  }
  return translator;
}

export async function translateToSpanish(text) {
  if (!text?.trim()) return null;
  try {
    const result = await getTranslator().translateText(text, 'en', 'es');
    return result.text ?? null;
  } catch (err) {
    console.error('[translation] DeepL error:', err.message);
    return null;
  }
}
