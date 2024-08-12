export async function copyToClipboard(text: string) {
	if (navigator.clipboard) {
		try {
			await navigator.clipboard.writeText(text);
			console.log('Text copied to clipboard using Clipboard API');
		} catch (err) {
			console.error('Failed to copy text using Clipboard API: ', err);
		}
	} else {
		// Fallback for older browsers
		fallbackCopyTextToClipboard(text);
	}
}

function fallbackCopyTextToClipboard(text: string) {
	const textArea = document.createElement('textarea');
	textArea.value = text;
	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();
	try {
		document.execCommand('copy');
		console.log('Text copied to clipboard using execCommand');
	} catch (err) {
		console.error('Failed to copy text using execCommand: ', err);
	}
	document.body.removeChild(textArea);
}
