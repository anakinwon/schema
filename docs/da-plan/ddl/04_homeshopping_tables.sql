-- dept_info
CREATE TABLE IF NOT EXISTS dept_info (
    dept_no                  character varying(10)          NOT NULL,
    dept_nm                  character varying(50)          NOT NULL,
    use_yn                   character varying(1)           NULL,
    regr_id                  character varying(50)          NOT NULL DEFAULT 'ADMIN',
    reg_dtm                  timestamp                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id                  character varying(50)          NOT NULL DEFAULT 'ADMIN',
    mod_dtm                  timestamp                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_dept_info PRIMARY KEY (dept_no)
);

-- user_info
CREATE TABLE IF NOT EXISTS user_info (
    usr_no                   character varying(10)          NOT NULL,
    usr_nm                   character varying(50)          NOT NULL,
    dept_no                  character varying(10)          NULL,
    phone_no                 character varying(13)          NULL,
    eml_addr                 text                           NULL,
    home_addr                text                           NULL,
    gnd_cd                   character varying(1)           NULL,
    join_dt                  date                           NULL,
    quit_dt                  date                           NULL,
    use_yn                   character varying(1)           NULL,
    regr_id                  character varying(50)          NOT NULL DEFAULT 'ADMIN',
    reg_dtm                  timestamp                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id                  character varying(50)          NOT NULL DEFAULT 'ADMIN',
    mod_dtm                  timestamp                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_user_info PRIMARY KEY (usr_no)
);

-- prod_info
CREATE TABLE IF NOT EXISTS prod_info (
    prd_no                   character varying(10)          NOT NULL,
    prd_nm                   character varying(100)         NOT NULL,
    prd_typ_cd               character varying(10)          NULL,
    prd_price                numeric(15,2)                  NULL,
    use_yn                   character varying(1)           NULL,
    regr_id                  character varying(50)          NOT NULL DEFAULT 'ADMIN',
    reg_dtm                  timestamp                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id                  character varying(50)          NOT NULL DEFAULT 'ADMIN',
    mod_dtm                  timestamp                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_prod_info PRIMARY KEY (prd_no)
);

-- prod_catal_info
CREATE TABLE IF NOT EXISTS prod_catal_info (
    prd_typ_cd               character varying(10)          NOT NULL,
    prd_typ_nm               character varying(100)         NOT NULL,
    up_prd_typ_cd            character varying(10)          NULL,
    use_yn                   character varying(1)           NULL,
    regr_id                  character varying(50)          NOT NULL DEFAULT 'ADMIN',
    reg_dtm                  timestamp                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id                  character varying(50)          NOT NULL DEFAULT 'ADMIN',
    mod_dtm                  timestamp                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_prod_catal_info PRIMARY KEY (prd_typ_cd)
);

-- order_info
CREATE TABLE IF NOT EXISTS order_info (
    od_no                    character varying(10)          NOT NULL,
    usr_no                   character varying(10)          NOT NULL,
    prd_no                   character varying(10)          NOT NULL,
    od_cnt                   integer                        NOT NULL,
    od_dt                    date                           NOT NULL,
    od_sts_cd                character varying(20)          NULL,
    ccl_dt                   date                           NULL,
    ccl_sts_yn               character varying(1)           NULL,
    use_yn                   character varying(1)           NULL,
    regr_id                  character varying(50)          NOT NULL DEFAULT 'ADMIN',
    reg_dtm                  timestamp                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id                  character varying(50)          NOT NULL DEFAULT 'ADMIN',
    mod_dtm                  timestamp                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_order_info PRIMARY KEY (od_no)
);