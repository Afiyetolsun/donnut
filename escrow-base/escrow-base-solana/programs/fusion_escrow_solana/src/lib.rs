use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer as SplTransfer};
use anchor_lang::solana_program::system_instruction;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"); // Placeholder, will be updated after first build

const ORDER_PDA_SEED_PREFIX_SOURCE: &[u8] = b"order_source";
const ORDER_PDA_SEED_PREFIX_DESTINATION: &[u8] = b"order_destination";
const ESCROW_AUTHORITY_SEED_PREFIX: &[u8] = b"escrow_authority";

#[program]
pub mod fusion_escrow_solana {
    use super::*;

    // --- Source Chain Logic ---

    pub fn create_order_source(
        ctx: Context<CreateOrderSourceAccounts>,
        order_id: [u8; 32],
        resolver_address: Pubkey,
        // token_mint_on_source: Pubkey, // Already in ctx.accounts.token_mint_source
        amount: u64,
        hash_secret: [u8; 32],
        timeout_duration_seconds: i64,
        safety_deposit_sol: u64,
    ) -> Result<()> {
        require_gt!(amount, 0, EscrowError::ZeroAmount);
        require_gt!(safety_deposit_sol, 0, EscrowError::ZeroAmount);

        let order = &mut ctx.accounts.order_state_source;
        order.order_id = order_id;
        order.maker = ctx.accounts.maker.key();
        order.resolver = resolver_address;
        order.token_mint_source = ctx.accounts.token_mint_source.key();
        order.amount = amount;
        order.safety_deposit_sol = safety_deposit_sol;
        order.hash_secret = hash_secret;
        order.creation_timestamp = Clock::get()?.unix_timestamp;
        order.timeout_duration_seconds = timeout_duration_seconds;
        order.is_withdrawn = false;
        order.is_cancelled = false;
        order.escrow_authority_bump = ctx.bumps.escrow_authority; // Store bump for PDA signing

        // Transfer SOL safety deposit from maker to the order_state_source PDA
        let ix = system_instruction::transfer(
            &ctx.accounts.maker.key(),
            &order.key(),
            safety_deposit_sol,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.maker.to_account_info(),
                order.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Transfer SPL tokens from maker to escrow token account
        let cpi_accounts = SplTransfer {
            from: ctx.accounts.maker_token_account_source.to_account_info(),
            to: ctx.accounts.escrow_token_account_source.to_account_info(),
            authority: ctx.accounts.maker.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        emit!(OrderCreatedSource {
            order_id,
            maker: order.maker,
            resolver: order.resolver,
            token_mint_source: order.token_mint_source,
            amount: order.amount,
            safety_deposit_sol: order.safety_deposit_sol,
            hash_secret: order.hash_secret,
            timeout_timestamp: order.creation_timestamp + order.timeout_duration_seconds,
        });

        Ok(())
    }

    pub fn withdraw_source(
        ctx: Context<WithdrawSourceAccounts>,
        _order_id: [u8; 32], // order_id is part of the PDA seed, not strictly needed as arg if using PDA correctly
        secret: [u8; 32],
    ) -> Result<()> {
        let order = &mut ctx.accounts.order_state_source;
        require_keys_eq!(ctx.accounts.resolver.key(), order.resolver, EscrowError::CallerNotResolver);
        
        let current_timestamp = Clock::get()?.unix_timestamp;
        require!(current_timestamp < order.creation_timestamp + order.timeout_duration_seconds, EscrowError::TimeoutExpired);
        require!(!order.is_withdrawn, EscrowError::AlreadyWithdrawn);
        require!(!order.is_cancelled, EscrowError::AlreadyCancelled);

        let provided_hash = anchor_lang::solana_program::keccak::hash(&secret).to_bytes();
        require!(provided_hash == order.hash_secret, EscrowError::InvalidSecret);

        order.is_withdrawn = true;

        // Transfer SPL tokens from escrow to resolver
        let order_id_bytes = order.order_id; // order.order_id is already [u8; 32]
        let authority_seeds = &[
            ESCROW_AUTHORITY_SEED_PREFIX,
            order_id_bytes.as_ref(),
            &[order.escrow_authority_bump],
        ];
        let signer_seeds = &[&authority_seeds[..]];

        let cpi_accounts = SplTransfer {
            from: ctx.accounts.escrow_token_account_source.to_account_info(),
            to: ctx.accounts.resolver_token_account_source.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, order.amount)?;

        // Transfer SOL safety deposit from order_state_source PDA to resolver
        let order_lamports = order.to_account_info().lamports();
        require_gte!(order_lamports, order.safety_deposit_sol, EscrowError::InsufficientEscrowBalance);
        
        **order.to_account_info().try_borrow_mut_lamports()? -= order.safety_deposit_sol;
        **ctx.accounts.resolver.to_account_info().try_borrow_mut_lamports()? += order.safety_deposit_sol;

        emit!(OrderWithdrawnSource { order_id: order.order_id, resolver: order.resolver, secret });
        
        // Closing accounts will be handled by Anchor if `close = resolver` is set on the PDA account in Accounts struct
        Ok(())
    }

    pub fn cancel_source(ctx: Context<CancelSourceAccounts>, _order_id: [u8; 32]) -> Result<()> {
        let order = &mut ctx.accounts.order_state_source;
        
        let current_timestamp = Clock::get()?.unix_timestamp;
        require!(current_timestamp >= order.creation_timestamp + order.timeout_duration_seconds, EscrowError::TimeoutNotExpired);
        require!(!order.is_withdrawn, EscrowError::AlreadyWithdrawn);
        require!(!order.is_cancelled, EscrowError::AlreadyCancelled);

        order.is_cancelled = true;

        // Transfer SPL tokens from escrow back to maker
        let order_id_bytes = order.order_id;
        let authority_seeds = &[
            ESCROW_AUTHORITY_SEED_PREFIX,
            order_id_bytes.as_ref(),
            &[order.escrow_authority_bump],
        ];
        let signer_seeds = &[&authority_seeds[..]];
        
        let cpi_accounts = SplTransfer {
            from: ctx.accounts.escrow_token_account_source.to_account_info(),
            to: ctx.accounts.maker_token_account_source.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, order.amount)?;

        // Transfer SOL safety deposit from order_state_source PDA back to maker
        let order_lamports = order.to_account_info().lamports();
        require_gte!(order_lamports, order.safety_deposit_sol, EscrowError::InsufficientEscrowBalance);

        **order.to_account_info().try_borrow_mut_lamports()? -= order.safety_deposit_sol;
        **ctx.accounts.maker.to_account_info().try_borrow_mut_lamports()? += order.safety_deposit_sol;

        emit!(OrderCancelledSource { order_id: order.order_id, canceller: ctx.accounts.canceller.key() });
        
        // Closing accounts handled by Anchor via `close = maker`
        Ok(())
    }

    // --- Destination Chain Logic ---

    pub fn fill_order_destination(
        ctx: Context<FillOrderDestinationAccounts>,
        order_id: [u8; 32], // Must match source order_id
        maker_on_source: Pubkey,
        // token_mint_on_destination: Pubkey, // Already in ctx.accounts
        amount_on_destination: u64,
        hash_secret: [u8; 32], // Must match source hash_secret
        timeout_duration_seconds: i64,
        safety_deposit_sol: u64,
    ) -> Result<()> {
        require_gt!(amount_on_destination, 0, EscrowError::ZeroAmount);
        require_gt!(safety_deposit_sol, 0, EscrowError::ZeroAmount);

        let order = &mut ctx.accounts.order_state_destination;
        order.order_id = order_id;
        order.maker_on_source = maker_on_source;
        order.resolver = ctx.accounts.resolver.key();
        order.token_mint_destination = ctx.accounts.token_mint_destination.key();
        order.amount_on_destination = amount_on_destination;
        order.safety_deposit_sol = safety_deposit_sol;
        order.hash_secret = hash_secret;
        order.creation_timestamp = Clock::get()?.unix_timestamp; // Timestamp when filled on dest
        order.timeout_duration_seconds = timeout_duration_seconds;
        order.is_withdrawn_by_maker = false;
        order.is_cancelled_by_resolver = false;
        order.escrow_authority_bump = ctx.bumps.escrow_authority;

        // Transfer SOL safety deposit from resolver to the order_state_destination PDA
        let ix = system_instruction::transfer(
            &ctx.accounts.resolver.key(),
            &order.key(),
            safety_deposit_sol,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.resolver.to_account_info(),
                order.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Transfer SPL tokens from resolver to escrow token account
        let cpi_accounts = SplTransfer {
            from: ctx.accounts.resolver_token_account_destination.to_account_info(),
            to: ctx.accounts.escrow_token_account_destination.to_account_info(),
            authority: ctx.accounts.resolver.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount_on_destination)?;

        emit!(OrderFilledDestination {
            order_id,
            maker_on_source,
            resolver: order.resolver,
            token_mint_destination: order.token_mint_destination,
            amount_on_destination: order.amount_on_destination,
            safety_deposit_sol: order.safety_deposit_sol,
            hash_secret: order.hash_secret,
            timeout_timestamp: order.creation_timestamp + order.timeout_duration_seconds,
        });
        Ok(())
    }

    pub fn withdraw_destination(
        ctx: Context<WithdrawDestinationAccounts>,
        _order_id: [u8; 32],
        secret: [u8; 32],
    ) -> Result<()> {
        let order = &mut ctx.accounts.order_state_destination;
        // Note: Maker on source is the one withdrawing here.
        // The `maker_on_destination_chain_signer` is the one initiating this transaction.
        // We need a way to verify this signer corresponds to `order.maker_on_source`.
        // This might require an off-chain signature verification or a trusted relayer model
        // if `maker_on_source` is an ETH address. For now, assume `maker_on_destination_chain_signer` IS the maker.
        require_keys_eq!(ctx.accounts.maker_on_destination_chain_signer.key(), order.maker_on_source, EscrowError::CallerNotMaker);

        let current_timestamp = Clock::get()?.unix_timestamp;
        require!(current_timestamp < order.creation_timestamp + order.timeout_duration_seconds, EscrowError::TimeoutExpired);
        require!(!order.is_withdrawn_by_maker, EscrowError::AlreadyWithdrawnByMaker);
        require!(!order.is_cancelled_by_resolver, EscrowError::AlreadyCancelledByResolver);

        let provided_hash = anchor_lang::solana_program::keccak::hash(&secret).to_bytes();
        require!(provided_hash == order.hash_secret, EscrowError::InvalidSecret);

        order.is_withdrawn_by_maker = true;

        // Transfer SPL tokens from escrow to maker
        let order_id_bytes = order.order_id;
        let authority_seeds = &[
            ESCROW_AUTHORITY_SEED_PREFIX,
            order_id_bytes.as_ref(),
            &[order.escrow_authority_bump],
        ];
        let signer_seeds = &[&authority_seeds[..]];

        let cpi_accounts = SplTransfer {
            from: ctx.accounts.escrow_token_account_destination.to_account_info(),
            to: ctx.accounts.maker_token_account_destination.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, order.amount_on_destination)?;

        // Transfer SOL safety deposit from order_state_destination PDA to maker
        let order_lamports = order.to_account_info().lamports();
        require_gte!(order_lamports, order.safety_deposit_sol, EscrowError::InsufficientEscrowBalance);
        
        **order.to_account_info().try_borrow_mut_lamports()? -= order.safety_deposit_sol;
        **ctx.accounts.maker_on_destination_chain_signer.to_account_info().try_borrow_mut_lamports()? += order.safety_deposit_sol;

        emit!(MakerWithdrawnDestination { order_id: order.order_id, maker: order.maker_on_source, secret });
        Ok(())
    }

    pub fn cancel_destination(ctx: Context<CancelDestinationAccounts>, _order_id: [u8; 32]) -> Result<()> {
        let order = &mut ctx.accounts.order_state_destination;
        require_keys_eq!(ctx.accounts.resolver.key(), order.resolver, EscrowError::CallerNotResolver);

        let current_timestamp = Clock::get()?.unix_timestamp;
        require!(current_timestamp >= order.creation_timestamp + order.timeout_duration_seconds, EscrowError::TimeoutNotExpired);
        require!(!order.is_withdrawn_by_maker, EscrowError::AlreadyWithdrawnByMaker);
        require!(!order.is_cancelled_by_resolver, EscrowError::AlreadyCancelledByResolver);

        order.is_cancelled_by_resolver = true;

        // Transfer SPL tokens from escrow back to resolver
        let order_id_bytes = order.order_id;
        let authority_seeds = &[
            ESCROW_AUTHORITY_SEED_PREFIX,
            order_id_bytes.as_ref(),
            &[order.escrow_authority_bump],
        ];
        let signer_seeds = &[&authority_seeds[..]];

        let cpi_accounts = SplTransfer {
            from: ctx.accounts.escrow_token_account_destination.to_account_info(),
            to: ctx.accounts.resolver_token_account_destination.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, order.amount_on_destination)?;

        // Transfer SOL safety deposit from order_state_destination PDA back to resolver
        let order_lamports = order.to_account_info().lamports();
        require_gte!(order_lamports, order.safety_deposit_sol, EscrowError::InsufficientEscrowBalance);

        **order.to_account_info().try_borrow_mut_lamports()? -= order.safety_deposit_sol;
        **ctx.accounts.resolver.to_account_info().try_borrow_mut_lamports()? += order.safety_deposit_sol;

        emit!(OrderCancelledByResolverDestination { order_id: order.order_id, resolver: order.resolver });
        Ok(())
    }
}

// --- Account Structs ---

#[derive(Accounts)]
#[instruction(order_id: [u8; 32])]
pub struct CreateOrderSourceAccounts<'info> {
    #[account(
        init,
        payer = maker,
        space = OrderStateSource::LEN,
        seeds = [ORDER_PDA_SEED_PREFIX_SOURCE, order_id.as_ref()],
        bump
    )]
    pub order_state_source: Account<'info, OrderStateSource>,

    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(mut)]
    pub maker_token_account_source: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = maker,
        token::mint = token_mint_source,
        token::authority = escrow_authority, // PDA is authority
        seeds = [ESCROW_AUTHORITY_SEED_PREFIX, order_id.as_ref(), b"token_source"], // Unique seed for this token account
        bump
    )]
    pub escrow_token_account_source: Account<'info, TokenAccount>,
    
    /// CHECK: This PDA acts as the authority for the escrow_token_account_source.
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED_PREFIX, order_id.as_ref()],
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,

    pub token_mint_source: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(order_id: [u8; 32])]
pub struct WithdrawSourceAccounts<'info> {
    #[account(
        mut,
        seeds = [ORDER_PDA_SEED_PREFIX_SOURCE, order_id.as_ref()],
        bump, // Anchor will verify bump matches order_state_source.escrow_authority_bump if it was stored
        has_one = resolver, // Ensures ctx.accounts.resolver.key == order_state_source.resolver
        close = resolver // Close order_state_source account and send lamports to resolver
    )]
    pub order_state_source: Account<'info, OrderStateSource>,

    #[account(mut)]
    pub resolver: Signer<'info>, // Resolver initiates this

    #[account(mut)]
    pub resolver_token_account_source: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = order_state_source.token_mint_source,
        token::authority = escrow_authority,
        seeds = [ESCROW_AUTHORITY_SEED_PREFIX, order_id.as_ref(), b"token_source"],
        bump, // We might need to store this bump on OrderStateSource if not derivable or pass it
        close = resolver // Close escrow token account and send lamports to resolver
    )]
    pub escrow_token_account_source: Account<'info, TokenAccount>,

    /// CHECK: PDA authority for the escrow token account.
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED_PREFIX, order_id.as_ref()],
        bump = order_state_source.escrow_authority_bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(order_id: [u8; 32])]
pub struct CancelSourceAccounts<'info> {
    #[account(
        mut,
        seeds = [ORDER_PDA_SEED_PREFIX_SOURCE, order_id.as_ref()],
        bump,
        has_one = maker, // Ensures funds go back to original maker
        close = maker // Close order_state_source account and send lamports to maker
    )]
    pub order_state_source: Account<'info, OrderStateSource>,

    #[account(mut)]
    pub maker: SystemAccount<'info>, // Receiver of SOL, not necessarily signer if anyone can cancel

    #[account(mut)]
    pub maker_token_account_source: Account<'info, TokenAccount>, // Receiver of tokens

    #[account(mut)]
    pub canceller: Signer<'info>, // Anyone can call cancel after timeout

    #[account(
        mut,
        token::mint = order_state_source.token_mint_source,
        token::authority = escrow_authority,
        seeds = [ESCROW_AUTHORITY_SEED_PREFIX, order_id.as_ref(), b"token_source"],
        bump,
        close = maker // Close escrow token account and send lamports to maker
    )]
    pub escrow_token_account_source: Account<'info, TokenAccount>,

    /// CHECK: PDA authority.
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED_PREFIX, order_id.as_ref()],
        bump = order_state_source.escrow_authority_bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
#[instruction(order_id: [u8; 32])]
pub struct FillOrderDestinationAccounts<'info> {
    #[account(
        init,
        payer = resolver,
        space = OrderStateDestination::LEN,
        seeds = [ORDER_PDA_SEED_PREFIX_DESTINATION, order_id.as_ref()],
        bump
    )]
    pub order_state_destination: Account<'info, OrderStateDestination>,

    #[account(mut)]
    pub resolver: Signer<'info>,

    #[account(mut)]
    pub resolver_token_account_destination: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = resolver,
        token::mint = token_mint_destination,
        token::authority = escrow_authority,
        seeds = [ESCROW_AUTHORITY_SEED_PREFIX, order_id.as_ref(), b"token_dest"], // Unique seed
        bump
    )]
    pub escrow_token_account_destination: Account<'info, TokenAccount>,

    /// CHECK: PDA authority.
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED_PREFIX, order_id.as_ref()], // Same authority PDA for both sides of the order_id
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,

    pub token_mint_destination: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(order_id: [u8; 32])]
pub struct WithdrawDestinationAccounts<'info> {
    #[account(
        mut,
        seeds = [ORDER_PDA_SEED_PREFIX_DESTINATION, order_id.as_ref()],
        bump,
        // has_one = maker_on_source, // This check is tricky if maker_on_source is not a Solana Pubkey directly usable as signer
        close = maker_on_destination_chain_signer
    )]
    pub order_state_destination: Account<'info, OrderStateDestination>,

    #[account(mut)]
    pub maker_on_destination_chain_signer: Signer<'info>, // The one signing this transaction, assumed to be the maker

    #[account(mut)]
    pub maker_token_account_destination: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = order_state_destination.token_mint_destination,
        token::authority = escrow_authority,
        seeds = [ESCROW_AUTHORITY_SEED_PREFIX, order_id.as_ref(), b"token_dest"],
        bump,
        close = maker_on_destination_chain_signer
    )]
    pub escrow_token_account_destination: Account<'info, TokenAccount>,

    /// CHECK: PDA authority.
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED_PREFIX, order_id.as_ref()],
        bump = order_state_destination.escrow_authority_bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(order_id: [u8; 32])]
pub struct CancelDestinationAccounts<'info> {
    #[account(
        mut,
        seeds = [ORDER_PDA_SEED_PREFIX_DESTINATION, order_id.as_ref()],
        bump,
        has_one = resolver,
        close = resolver
    )]
    pub order_state_destination: Account<'info, OrderStateDestination>,

    #[account(mut)]
    pub resolver: Signer<'info>, // Resolver cancels and gets funds back

    #[account(mut)]
    pub resolver_token_account_destination: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = order_state_destination.token_mint_destination,
        token::authority = escrow_authority,
        seeds = [ESCROW_AUTHORITY_SEED_PREFIX, order_id.as_ref(), b"token_dest"],
        bump,
        close = resolver
    )]
    pub escrow_token_account_destination: Account<'info, TokenAccount>,

    /// CHECK: PDA authority.
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED_PREFIX, order_id.as_ref()],
        bump = order_state_destination.escrow_authority_bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}


// --- State Structs ---

#[account]
pub struct OrderStateSource {
    pub order_id: [u8; 32],
    pub maker: Pubkey,
    pub resolver: Pubkey,
    pub token_mint_source: Pubkey,
    pub amount: u64,
    pub safety_deposit_sol: u64,
    pub hash_secret: [u8; 32],
    pub creation_timestamp: i64,
    pub timeout_duration_seconds: i64,
    pub is_withdrawn: bool,
    pub is_cancelled: bool,
    pub escrow_authority_bump: u8, // To sign for escrow token account
}

impl OrderStateSource {
    // 8 (discriminator) + 32 (order_id) + 32 (maker) + 32 (resolver) + 32 (token_mint) + 8 (amount)
    // + 8 (safety_deposit) + 32 (hash_secret) + 8 (creation_ts) + 8 (timeout_duration)
    // + 1 (is_withdrawn) + 1 (is_cancelled) + 1 (escrow_authority_bump)
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 32 + 8 + 8 + 1 + 1 + 1;
}


#[account]
pub struct OrderStateDestination {
    pub order_id: [u8; 32],
    pub maker_on_source: Pubkey,
    pub resolver: Pubkey,
    pub token_mint_destination: Pubkey,
    pub amount_on_destination: u64,
    pub safety_deposit_sol: u64,
    pub hash_secret: [u8; 32],
    pub creation_timestamp: i64,
    pub timeout_duration_seconds: i64,
    pub is_withdrawn_by_maker: bool,
    pub is_cancelled_by_resolver: bool,
    pub escrow_authority_bump: u8,
}

impl OrderStateDestination {
    // 8 (discriminator) + 32 (order_id) + 32 (maker_on_source) + 32 (resolver) + 32 (token_mint)
    // + 8 (amount) + 8 (safety_deposit) + 32 (hash_secret) + 8 (creation_ts) + 8 (timeout_duration)
    // + 1 (is_withdrawn) + 1 (is_cancelled) + 1 (escrow_authority_bump)
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 32 + 8 + 8 + 1 + 1 + 1;
}

// --- Events ---

#[event]
pub struct OrderCreatedSource {
    pub order_id: [u8; 32],
    pub maker: Pubkey,
    pub resolver: Pubkey,
    pub token_mint_source: Pubkey,
    pub amount: u64,
    pub safety_deposit_sol: u64,
    pub hash_secret: [u8; 32],
    pub timeout_timestamp: i64,
}

#[event]
pub struct OrderWithdrawnSource {
    pub order_id: [u8; 32],
    pub resolver: Pubkey,
    pub secret: [u8; 32],
}

#[event]
pub struct OrderCancelledSource {
    pub order_id: [u8; 32],
    pub canceller: Pubkey,
}

#[event]
pub struct OrderFilledDestination {
    pub order_id: [u8; 32],
    pub maker_on_source: Pubkey,
    pub resolver: Pubkey,
    pub token_mint_destination: Pubkey,
    pub amount_on_destination: u64,
    pub safety_deposit_sol: u64,
    pub hash_secret: [u8; 32],
    pub timeout_timestamp: i64,
}

#[event]
pub struct MakerWithdrawnDestination {
    pub order_id: [u8; 32],
    pub maker: Pubkey, // maker_on_source
    pub secret: [u8; 32],
}

#[event]
pub struct OrderCancelledByResolverDestination {
    pub order_id: [u8; 32],
    pub resolver: Pubkey,
}


// --- Errors ---
#[error_code]
pub enum EscrowError {
    #[msg("The order ID already exists or an account for it is already initialized.")]
    OrderAlreadyExists, // Used if PDA init fails due to existing account
    #[msg("The order does not exist.")]
    OrderDoesNotExist, // Should be caught by Anchor if PDA not found
    #[msg("The order has already been withdrawn.")]
    AlreadyWithdrawn,
    #[msg("The order has already been cancelled.")]
    AlreadyCancelled,
    #[msg("The timeout period has not yet expired.")]
    TimeoutNotExpired,
    #[msg("The timeout period has expired.")]
    TimeoutExpired,
    #[msg("The secret provided is invalid.")]
    InvalidSecret,
    #[msg("The caller is not the designated resolver for this order.")]
    CallerNotResolver,
    #[msg("The caller is not the designated maker for this order.")]
    CallerNotMaker,
    #[msg("Token transfer failed.")]
    TokenTransferFailed, // Generic, specific SPL errors might be better
    #[msg("Amount or safety deposit cannot be zero.")]
    ZeroAmount,
    #[msg("The order has already been withdrawn by the maker on the destination chain.")]
    AlreadyWithdrawnByMaker,
    #[msg("The order has already been cancelled by the resolver on the destination chain.")]
    AlreadyCancelledByResolver,
    #[msg("Insufficient SOL balance in the escrow/order PDA for transfer.")]
    InsufficientEscrowBalance,
    #[msg("An arithmetic overflow occurred.")]
    Overflow, // Anchor handles this by default with checked-cfg
}
