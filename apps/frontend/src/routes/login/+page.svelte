<script>
	import TelegramLoginWidget from '$components/TelegramLoginWidget.svelte';
</script>

<div class="w-screen h-screen flex">
	<div class="hidden w-full h-full bg-[#005952] md:block"></div>
	<div class="h-screen w-full bg-black relative">
		<div class="h-screen w-full overflow-hidden absolute">
			<img src="login/dark_pattern.jpg" alt="dark_pattern" class="w-full h-screen object-cover" />
		</div>
		<div class="absolute w-full text-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
			<h1 class="text-4xl text-white font-bold manrope">Sniperoo</h1>
			<h2 class="text-2xl text-green-600 mt-4 font-bold manrope">Welcome to Sniperoo</h2>
			<p class="text-base mt-4 text-white manrope">The Automated Trading Platform</p>
			<div class="mt-12"><TelegramLoginWidget /></div>
			<div class="mt-6 flex items-center justify-center">
				<img src="login/login_with_google.png" alt="login_with_google" class="w-50" />
			</div>
			<p class="text-white text-xs mt-8 manrope">
				By proceeding, you agree to these <br />
				<a href="/terms_and_conditions" class="underline font-bold">Terms and Conditions.</a>
			</p>
		</div>
	</div>
</div>
