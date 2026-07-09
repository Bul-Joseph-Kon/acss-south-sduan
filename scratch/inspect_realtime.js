import { createClient } from '@supabase/supabase-js';

const url = 'https://avpoufxsjiecbsxvngip.supabase.co';
const key = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(url, key);

console.log('onOpen type:', typeof supabase.realtime.onOpen);
console.log('onClose type:', typeof supabase.realtime.onClose);
console.log('onError type:', typeof supabase.realtime.onError);
