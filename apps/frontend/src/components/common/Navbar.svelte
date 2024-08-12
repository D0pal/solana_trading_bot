<script>
	import {
		Navbar,
		NavBrand,
		NavLi,
		NavUl,
		NavHamburger,
		Avatar,
		Dropdown,
		DropdownItem,
		DropdownHeader,
		DropdownDivider
	} from 'flowbite-svelte';
	import { page } from '$app/stores';
	$: activeUrl = $page.url.pathname;
</script>

<Navbar color="none" class="quicksand px-8 py-4 md:p-4">
	<NavBrand href="/">
		<span class="self-center logo whitespace-nowrap text-xl font-semibold audiowide dark:text-white">Sniperoo</span>
	</NavBrand>
	<div class="flex items-center md:order-2">
		<Avatar
			class="md:!w-12 md:!h-12 !bg-[#36394C] p-1 border border-[#e0e0e0] hover:cursor-pointer hover:brightness-75"
			id="avatar-menu"
			src="/dashboard/userIcon.png"
		/>
		<!-- <NavHamburger class1="w-full md:flex md:w-auto md:order-1" /> -->
	</div>
	<Dropdown placement="bottom" triggeredBy="#avatar-menu">
		<DropdownHeader>
			<span class="block text-sm">@britishculottes</span>
		</DropdownHeader>
		<DropdownItem>Referral Dashboard</DropdownItem>
		<DropdownItem>Transactions</DropdownItem>
		<DropdownItem>Settings</DropdownItem>
		<DropdownDivider />
		<DropdownItem>Sign out</DropdownItem>
	</Dropdown>
	<NavUl {activeUrl} activeClass="active">
		<NavLi class="font-bold text-lg text-gray-400 !px-4 !py-2 hover:!bg-slate-700" href="/dashboard/trade">Trade</NavLi>
		<NavLi class="font-bold text-lg text-gray-400 !px-4 !py-2 hover:!bg-slate-700" href="/dashboard/sniper"
			>Sniper</NavLi
		>
		<NavLi class="font-bold text-lg text-gray-400 !px-4 !py-2 hover:!bg-slate-700" href="/dashboard/copy-trade"
			>Copy Trade</NavLi
		>
		<NavLi class="font-bold text-lg text-gray-400 !px-4 !py-2 hover:!bg-slate-700" href="/dashboard/wallets"
			>Wallets</NavLi
		>
		<!-- <NavLi class="font-bold navLi text-lg !px-4 !py-2 hover:!bg-slate-700" href="/contact">Contact</NavLi> -->
	</NavUl>
</Navbar>

<style>
	.logo {
		font-family: 'Audiowide', cursive;
		text-align: center;
		color: #00ffff;
		letter-spacing: 4px;
		text-shadow:
			0 0 5px #00ffff,
			0 0 10px #00ffff;
		animation: subtle-pulse 4s ease-in-out infinite;
		text-transform: uppercase;
	}

	:global(.navLi) {
		text-shadow: 0 0 3px #e0e0e0;
		color: #e0e0e0 !important;
	}

	:global(.active) {
		text-shadow: 0 0 3px #e0e0e0;
		color: #e0e0e0 !important;
	}

	@keyframes subtle-pulse {
		0%,
		100% {
			text-shadow:
				0 0 5px #00ffff,
				0 0 10px #00ffff;
		}
		50% {
			text-shadow:
				0 0 10px #00ffff,
				0 0 20px #00ffff;
		}
	}
</style>
