export const a = <div dangerouslySetInnerHTML={{ __html: 'x' }} />;
export const b = db.sql.raw('select 1');
export const c = client.unsafe('select 1');
export const d = process.env.NEXT_PUBLIC_KEY;
