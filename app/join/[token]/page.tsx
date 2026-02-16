
import { redirect } from 'next/navigation';

export default async function JoinRedirectPage(props: { params: Promise<{ token: string }> }) {
    const params = await props.params;
    redirect(`/groups/join/${params.token}`);
}
